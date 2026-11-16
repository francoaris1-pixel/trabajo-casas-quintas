import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import {
  authenticate,
  createToken,
  hashPassword,
  publicUser,
  requireRole,
  verifyPassword,
} from "./auth.js";
import {
  Foto,
  MetodoPago,
  Pago,
  Propiedad,
  Reserva,
  Usuario,
} from "./models.js";
import { ensureTestData } from "./seed-data.js";
import { enviarMail, mailBienvenida, mailReserva } from "./mailer.js";

const app = express();
const uploadsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "uploads"
);
mkdirSync(uploadsDirectory, { recursive: true });

const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${imageTypes.get(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      const error = new Error("Formato de imagen no permitido");
      error.code = "INVALID_IMAGE_TYPE";
      callback(error);
      return;
    }
    callback(null, true);
  },
});
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(async (error) => {
    if (Array.isArray(req.files) && req.files.length) {
      await removeUploadedFiles(req.files).catch((cleanupError) => {
        console.error("No se pudieron limpiar imágenes de una solicitud fallida:", cleanupError);
      });
    }
    next(error);
  });
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizePhone = (value) =>
  typeof value === "string" ? value.trim().replace(/[^\d+]/g, "") : "";
const validPhone = /^\+?\d{7,15}$/;
const paymentMethods = new Set([
  "efectivo",
  "tarjeta_debito",
  "tarjeta_credito",
  "transferencia_bancaria",
  "billetera_virtual",
]);
const parseDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
};
const todayInGoya = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Argentina/Cordoba",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const uploadedFiles = (req) => (Array.isArray(req.files) ? req.files : []);
const removeUploadedFiles = async (files) => {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      })
    )
  );
};
const isValidImageContent = async (file) => {
  const handle = await fs.open(file.path, "r");
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (file.mimetype === "image/jpeg") {
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (file.mimetype === "image/png") {
      return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    if (file.mimetype === "image/gif") {
      const signature = header.subarray(0, 6).toString("ascii");
      return signature === "GIF87a" || signature === "GIF89a";
    }
    return (
      file.mimetype === "image/webp" &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP"
    );
  } finally {
    await handle.close();
  }
};
const addPropertyPhotos = async (properties) => {
  if (!properties.length) return properties;
  const photos = await Foto.find({
    propiedad: { $in: properties.map((property) => property._id) },
  })
    .sort({ _id: -1 })
    .lean();
  const photosByProperty = new Map();
  photos.forEach((photo) => {
    const key = String(photo.propiedad);
    const propertyPhotos = photosByProperty.get(key) || [];
    propertyPhotos.push(photo);
    photosByProperty.set(key, propertyPhotos);
  });
  return properties.map((property) => {
    const propertyPhotos = photosByProperty.get(String(property._id)) || [];
    return {
      ...property,
      fotos: propertyPhotos,
      foto: propertyPhotos[0]?.archivo || null,
    };
  });
};
const removeStoredPhotoFiles = async (photos) => {
  await Promise.all(
    photos.map(async (photo) => {
      if (typeof photo.archivo !== "string" || !photo.archivo.startsWith("/uploads/")) {
        return;
      }
      const uploadName = photo.archivo.slice("/uploads/".length);
      const filename = path.basename(uploadName);
      if (filename !== uploadName) return;
      const filePath = path.join(uploadsDirectory, filename);
      try {
        if (await Foto.exists({ archivo: photo.archivo })) return;
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("No se pudo eliminar una imagen reemplazada:", error);
        }
      }
    })
  );
};

app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN ||
      (process.env.NODE_ENV === "production" ? false : true),
  })
);
app.use("/uploads", express.static(uploadsDirectory, { maxAge: "1d", immutable: true }));
app.use(express.json({ limit: "1mb" }));

let databaseReady;
const ensureDatabase = () => {
  if (!databaseReady) {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET.length < 32 ||
        process.env.JWT_SECRET.startsWith("replace-"))
    ) {
      return Promise.reject(
        new Error("Configura JWT_SECRET con al menos 32 caracteres aleatorios")
      );
    }
    const mongoUri =
      process.env.MONGODB_URI ||
      (process.env.NODE_ENV === "production"
        ? ""
        : "mongodb://127.0.0.1:27017/goya_quintas_test");
    if (!mongoUri) {
      return Promise.reject(new Error("MONGODB_URI es obligatorio en produccion"));
    }
    databaseReady = mongoose
      .connect(mongoUri)
      .then(() => ensureTestData())
      .catch((error) => {
        databaseReady = null;
        throw error;
      });
  }
  return databaseReady;
};

app.use((req, res, next) => {
  ensureDatabase().then(() => next()).catch(next);
});

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    res.json({ ok: true });
  })
);

app.post(
  "/api/login",
  asyncRoute(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const identificador = typeof body.identificador === "string"
      ? body.identificador.trim()
      : typeof body.correo === "string"
      ? body.correo.trim()
      : "";
    const contrasena = typeof body.contrasena === "string" ? body.contrasena : "";
    if (!identificador || !contrasena) {
      return res.status(400).json({ error: "El correo o teléfono y la contraseña son obligatorios" });
    }

    const query = validEmail.test(identificador)
      ? { correo: identificador.toLowerCase() }
      : { telefono: normalizePhone(identificador) };
    if ("telefono" in query && !validPhone.test(query.telefono)) {
      return res.status(400).json({ error: "Ingresa un correo electrónico o teléfono válido" });
    }
    const user = await Usuario.findOne(query).select("+contrasena");
    if (!user || !(await verifyPassword(contrasena, user.contrasena))) {
      return res.status(401).json({ error: "Correo o contrasena incorrectos" });
    }
    res.json({
      mensaje: `Bienvenido ${user.nombre}`,
      usuario: publicUser(user),
      token: createToken(user._id),
    });
  })
);

app.post(
  "/api/registro",
  asyncRoute(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const apellido = typeof body.apellido === "string" ? body.apellido.trim() : "";
    const correo = typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
    const telefono = normalizePhone(body.telefono);
    const contrasena = typeof body.contrasena === "string" ? body.contrasena : "";
    if (!nombre || (correo && !validEmail.test(correo)) || contrasena.length < 8) {
      return res.status(400).json({
        error: "Ingresa un nombre, un correo válido y una contraseña de al menos 8 caracteres",
      });
    }
    if (telefono && !validPhone.test(telefono)) {
      return res.status(400).json({ error: "Ingresa un teléfono válido" });
    }
    if (!correo && !telefono) {
      return res.status(400).json({ error: "Indica un correo electrónico o teléfono para iniciar sesión" });
    }
    if (correo && await Usuario.exists({ correo })) {
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    }
    if (telefono && await Usuario.exists({ telefono })) {
      return res.status(409).json({ error: "Ese teléfono ya está registrado" });
    }

    const user = await Usuario.create({
      nombre,
      apellido,
      ...(correo ? { correo } : {}),
      contrasena: await hashPassword(contrasena),
      ...(telefono ? { telefono } : {}),
      rol: "inquilino",
    });
    res.status(201).json({
      mensaje: `Cuenta creada. Bienvenido ${user.nombre}`,
      usuario: publicUser(user),
      token: createToken(user._id),
    });
    if (user.correo) {
      const mail = mailBienvenida(user);
      void enviarMail(mail.para, mail.asunto, mail.html).catch((error) =>
        console.error("No se pudo enviar el mail de bienvenida:", error.message)
      );
    }
  })
);

app.get(
  "/api/auth/me",
  authenticate,
  asyncRoute(async (req, res) => {
    res.json({ usuario: publicUser(req.user) });
  })
);

app.get(
  "/api/propiedades",
  asyncRoute(async (_req, res) => {
    const properties = await Propiedad.find({ estado: "disponible" })
      .populate("propietario", "nombre apellido")
      .sort({ _id: -1 })
      .lean();
    const withPhotos = await addPropertyPhotos(properties);
    res.json(withPhotos);
  })
);

app.get(
  "/api/propiedades/:id",
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const property = await Propiedad.findOne({
      _id: req.params.id,
      estado: "disponible",
    })
      .populate("propietario", "nombre apellido")
      .lean();
    if (!property) {
      return res.status(404).json({ error: "Propiedad no encontrada" });
    }
    const photos = await Foto.find({ propiedad: property._id }).lean();
    res.json({ ...property, fotos: photos });
  })
);

app.get(
  "/api/propiedades/:propiedadId/reservas",
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.propiedadId)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const reservations = await Reserva.find({
      propiedad: req.params.propiedadId,
      estado: { $ne: "cancelada" },
    }).select("fechaInicio fechaFin estado");
    res.json(
      reservations.map((reservation) => ({
        id: reservation._id,
        checkIn: reservation.fechaInicio,
        checkOut: reservation.fechaFin,
        estado: reservation.estado,
      }))
    );
  })
);

app.post(
  "/api/reservas",
  authenticate,
  requireRole("inquilino"),
  asyncRoute(async (req, res) => {
    const { propiedadId, checkIn, checkOut, metodoPago = "efectivo" } = req.body;
    if (
      !mongoose.Types.ObjectId.isValid(propiedadId) ||
      !checkIn ||
      !checkOut ||
      !paymentMethods.has(metodoPago)
    ) {
      return res.status(400).json({ error: "Los datos de la reserva son invalidos" });
    }
    const start = parseDateOnly(checkIn);
    const end = parseDateOnly(checkOut);
    if (!start || !end || checkIn < todayInGoya() || checkOut <= checkIn) {
      return res.status(400).json({ error: "Las fechas de la reserva son invalidas" });
    }

    const property = await Propiedad.findOne({
      _id: propiedadId,
      estado: "disponible",
    });
    if (!property) {
      return res.status(404).json({ error: "Propiedad no disponible" });
    }
    const overlap = await Reserva.exists({
      propiedad: property._id,
      estado: { $ne: "cancelada" },
      fechaInicio: { $lt: end },
      fechaFin: { $gt: start },
    });
    if (overlap) {
      return res.status(409).json({ error: "Esas fechas ya estan reservadas" });
    }

    const nights = Math.round((end - start) / 86400000);
    const reservation = await Reserva.create({
      propiedad: property._id,
      turista: req.user._id,
      fechaInicio: start,
      fechaFin: end,
      montoTotal: nights * property.precioPorNoche,
      estado: "pendiente",
    });
    let payment;
    try {
      payment = await Pago.create({
        reserva: reservation._id,
        montoPagado: reservation.montoTotal,
        metodoPago,
        estado: "pendiente",
      });
    } catch (error) {
      await Reserva.findByIdAndDelete(reservation._id);
      throw error;
    }

    res.status(201).json({
      mensaje: "Solicitud de reserva registrada. El pago queda pendiente de confirmacion.",
      reserva: {
        id: reservation._id,
        propiedadId: property._id,
        propiedadTitulo: property.titulo,
        checkIn: reservation.fechaInicio,
        checkOut: reservation.fechaFin,
        montoTotal: reservation.montoTotal,
        estado: reservation.estado,
      },
      pago: {
        id: payment._id,
        monto: payment.montoPagado,
        metodoPago: payment.metodoPago,
        estado: payment.estado,
      },
    });
    if (req.user.correo) {
      const mail = mailReserva({
        usuario: req.user,
        propiedad: property,
        reserva: reservation,
        metodoPago,
      });
      void enviarMail(mail.para, mail.asunto, mail.html).catch((error) =>
        console.error("No se pudo enviar el mail de reserva:", error.message)
      );
    }
  })
);

app.get(
  "/api/reservas/mis",
  authenticate,
  requireRole("inquilino"),
  asyncRoute(async (req, res) => {
    const reservations = await Reserva.find({ turista: req.user._id })
      .populate("propiedad", "titulo")
      .sort({ fechaCreacion: -1 })
      .lean();
    res.json(
      reservations.map((reservation) => ({
        id: reservation._id,
        propiedadId: reservation.propiedad?._id,
        propiedadTitulo: reservation.propiedad?.titulo || "Propiedad",
        checkIn: reservation.fechaInicio,
        checkOut: reservation.fechaFin,
        montoTotal: reservation.montoTotal,
        estado: reservation.estado,
      }))
    );
  })
);

app.put(
  "/api/reservas/:id/cancelar",
  authenticate,
  requireRole("inquilino"),
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de reserva invalido" });
    }
    const reservation = await Reserva.findOneAndUpdate(
      {
        _id: req.params.id,
        turista: req.user._id,
        estado: { $ne: "cancelada" },
      },
      { $set: { estado: "cancelada" } },
      { new: true }
    );
    if (!reservation) {
      const exists = await Reserva.exists({ _id: req.params.id });
      return res
        .status(exists ? 403 : 404)
        .json({ error: exists ? "No podes cancelar una reserva ajena o ya cancelada" : "Reserva no encontrada" });
    }
    await Pago.updateMany({ reserva: reservation._id }, { $set: { estado: "cancelado" } });
    res.json({ mensaje: "Reserva cancelada correctamente" });
  })
);

app.get(
  "/api/propietario/panel",
  authenticate,
  requireRole("anfitrion"),
  asyncRoute(async (req, res) => {
    const properties = await Propiedad.find({ propietario: req.user._id }).lean();
    const propertyIds = properties.map((property) => property._id);
    const reservations = await Reserva.find({
      propiedad: { $in: propertyIds },
      estado: { $ne: "cancelada" },
    })
      .populate("propiedad", "titulo precioPorNoche")
      .populate("turista", "nombre apellido telefono")
      .sort({ fechaCreacion: -1 })
      .lean();
    const stats = properties.map((property) => {
      const relevant = reservations.filter(
        (reservation) =>
          String(reservation.propiedad?._id) === String(property._id)
      );
      const nights = relevant.reduce(
        (total, reservation) =>
          total + Math.max(0, Math.round((reservation.fechaFin - reservation.fechaInicio) / 86400000)),
        0
      );
      const gross = nights * property.precioPorNoche;
      return {
        propiedadId: property._id,
        titulo: property.titulo,
        precioPorNoche: property.precioPorNoche,
        reservas: relevant.length,
        noches: nights,
        ingresos: gross,
        liquidacion: gross * 0.9,
      };
    });
    res.json({
      propiedades: properties,
      reservas: reservations.map((reservation) => ({
        id: reservation._id,
        propiedadId: reservation.propiedad?._id,
        propiedadTitulo: reservation.propiedad?.titulo,
        checkIn: reservation.fechaInicio,
        checkOut: reservation.fechaFin,
        estado: reservation.estado,
        turista: reservation.turista,
      })),
      estadisticas: stats,
    });
  })
);

app.post(
  "/api/propiedades",
  authenticate,
  requireRole("anfitrion"),
  asyncRoute(async (req, res) => {
    const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, foto } =
      req.body;
    const price = Number(precioPorNoche);
    const guests = Number(maxHuespedes || 4);
    if (!String(titulo || "").trim() || !Number.isFinite(price) || price < 0 ||
        !Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({ error: "Los datos de la propiedad son invalidos" });
    }
    const property = await Propiedad.create({
      propietario: req.user._id,
      titulo: String(titulo).trim(),
      descripcion: String(descripcion || "").trim(),
      direccion: String(direccion || "").trim(),
      maxHuespedes: guests,
      precioPorNoche: price,
      estado: "pending_review",
    });
    if (foto) {
      await Foto.create({
        propiedad: property._id,
        archivo: String(foto),
        descripcion: "Foto principal",
      });
    }
    res.status(201).json({ mensaje: "Propiedad enviada a revision", propiedad: property });
  })
);

app.put(
  "/api/propietario/propiedades/:id",
  authenticate,
  requireRole("anfitrion"),
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const property = await Propiedad.findOne({
      _id: req.params.id,
      propietario: req.user._id,
    });
    if (!property) return res.status(404).json({ error: "Propiedad no encontrada" });
    const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche } = req.body;
    if (titulo !== undefined) property.titulo = String(titulo).trim();
    if (descripcion !== undefined) property.descripcion = String(descripcion).trim();
    if (direccion !== undefined) property.direccion = String(direccion).trim();
    if (maxHuespedes !== undefined) {
      const guests = Number(maxHuespedes);
      if (!Number.isInteger(guests) || guests < 1) {
        return res.status(400).json({ error: "Cantidad de huespedes invalida" });
      }
      property.maxHuespedes = guests;
    }
    if (precioPorNoche !== undefined) {
      const price = Number(precioPorNoche);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "Precio invalido" });
      }
      property.precioPorNoche = price;
    }
    await property.save();
    res.json({ mensaje: "Propiedad actualizada", propiedad: property });
  })
);

app.delete(
  "/api/propietario/propiedades/:id",
  authenticate,
  requireRole("anfitrion"),
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const property = await Propiedad.findOne({
      _id: req.params.id,
      propietario: req.user._id,
    });
    if (!property) return res.status(404).json({ error: "Propiedad no encontrada" });
    if (await Reserva.exists({ propiedad: property._id, estado: { $ne: "cancelada" } })) {
      return res.status(409).json({ error: "No se puede eliminar una propiedad con reservas activas" });
    }
    const photos = await Foto.find({ propiedad: property._id }).lean();
    await Foto.deleteMany({ propiedad: property._id });
    await property.deleteOne();
    await removeStoredPhotoFiles(photos);
    res.json({ mensaje: "Propiedad eliminada" });
  })
);

app.get(
  "/api/admin/panel",
  authenticate,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    const [properties, reservations] = await Promise.all([
      Propiedad.find()
        .populate("propietario", "nombre apellido correo telefono")
        .sort({ _id: -1 })
        .lean(),
      Reserva.find()
        .populate("propiedad", "titulo")
        .populate("turista", "nombre apellido")
        .sort({ fechaCreacion: -1 })
        .lean(),
    ]);
    const withPhotos = await addPropertyPhotos(properties);
    res.json({ propiedades: withPhotos, reservas: reservations });
  })
);

app.get(
  "/api/admin/propietarios",
  authenticate,
  requireRole("admin"),
  asyncRoute(async (_req, res) => {
    const owners = await Usuario.find({ rol: "anfitrion" })
      .select("nombre apellido correo telefono")
      .lean();
    const counts = await Propiedad.aggregate([
      { $group: { _id: "$propietario", count: { $sum: 1 } } },
    ]);
    const countByOwner = new Map(counts.map((item) => [String(item._id), item.count]));
    res.json(
      owners.map((owner) => ({
        ...owner,
        propiedades: countByOwner.get(String(owner._id)) || 0,
      }))
    );
  })
);

app.put(
  "/api/admin/propiedades/:id",
  authenticate,
  requireRole("admin"),
  imageUpload.array("images", 10),
  asyncRoute(async (req, res) => {
    const files = uploadedFiles(req);
    const rejectRequest = async (message) => {
      await removeUploadedFiles(files);
      return res.status(400).json({ error: message });
    };

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return rejectRequest("ID de propiedad invalido");
    }
    const property = await Propiedad.findById(req.params.id);
    if (!property) {
      await removeUploadedFiles(files);
      return res.status(404).json({ error: "Propiedad no encontrada" });
    }

    for (const file of files) {
      if (!(await isValidImageContent(file))) {
        return rejectRequest("El contenido de uno de los archivos no es una imagen valida");
      }
    }

    let keepPhotoIds;
    if (req.body.keepPhotoIds !== undefined) {
      try {
        keepPhotoIds =
          typeof req.body.keepPhotoIds === "string"
            ? JSON.parse(req.body.keepPhotoIds)
            : req.body.keepPhotoIds;
      } catch {
        return rejectRequest("La lista de imagenes actuales no es valida");
      }
      if (
        !Array.isArray(keepPhotoIds) ||
        keepPhotoIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
      ) {
        return rejectRequest("La lista de imagenes actuales no es valida");
      }
      keepPhotoIds = [...new Set(keepPhotoIds.map(String))];
    }

    const existingPhotos = await Foto.find({ propiedad: property._id }).lean();
    const existingPhotoIds = new Set(existingPhotos.map((photo) => String(photo._id)));
    if (keepPhotoIds?.some((id) => !existingPhotoIds.has(id))) {
      return rejectRequest("Una o mas imagenes no pertenecen a esta propiedad");
    }
    const photosToKeep =
      keepPhotoIds === undefined
        ? existingPhotos
        : existingPhotos.filter((photo) => keepPhotoIds.includes(String(photo._id)));
    const photosToRemove = existingPhotos.filter(
      (photo) => !photosToKeep.some((keptPhoto) => String(keptPhoto._id) === String(photo._id))
    );
    if (photosToKeep.length + files.length > 10) {
      return rejectRequest("Una propiedad puede tener un maximo de 10 imagenes");
    }

    const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado } =
      req.body;
    const normalizedTitle = titulo === undefined ? undefined : String(titulo).trim();
    if (normalizedTitle !== undefined && !normalizedTitle) {
      return rejectRequest("El titulo de la propiedad es obligatorio");
    }
    let guests;
    if (maxHuespedes !== undefined) {
      guests = Number(maxHuespedes);
      if (!Number.isInteger(guests) || guests < 1) {
        return rejectRequest("Cantidad de huespedes invalida");
      }
    }
    let price;
    if (precioPorNoche !== undefined) {
      price = Number(precioPorNoche);
      if (!Number.isFinite(price) || price < 0) {
        return rejectRequest("Precio invalido");
      }
    }
    if (estado !== undefined) {
      if (!["pending_review", "disponible", "suspendida"].includes(estado)) {
        return rejectRequest("Estado de propiedad invalido");
      }
    }

    let addedPhotos = [];
    try {
      if (files.length) {
        addedPhotos = await Foto.insertMany(
          files.map((file) => ({
            propiedad: property._id,
            archivo: `/uploads/${file.filename}`,
            descripcion: "",
          }))
        );
      }
      if (normalizedTitle !== undefined) property.titulo = normalizedTitle;
      if (descripcion !== undefined) property.descripcion = String(descripcion).trim();
      if (direccion !== undefined) property.direccion = String(direccion).trim();
      if (guests !== undefined) property.maxHuespedes = guests;
      if (price !== undefined) property.precioPorNoche = price;
      if (estado !== undefined) property.estado = estado;
      await property.save();
      if (photosToRemove.length) {
        await Foto.deleteMany({
          propiedad: property._id,
          _id: { $in: photosToRemove.map((photo) => photo._id) },
        });
      }
    } catch (error) {
      if (addedPhotos.length) {
        await Foto.deleteMany({ _id: { $in: addedPhotos.map((photo) => photo._id) } });
      }
      await removeUploadedFiles(files);
      throw error;
    }

    await removeStoredPhotoFiles(photosToRemove);
    res.json({
      mensaje: "Propiedad actualizada",
      propiedad: {
        ...property.toObject(),
        fotos: [...photosToKeep, ...addedPhotos],
        foto: addedPhotos[0]?.archivo || photosToKeep[0]?.archivo || null,
      },
    });
  })
);

app.delete(
  "/api/admin/propiedades/:id",
  authenticate,
  requireRole("admin"),
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const property = await Propiedad.findById(req.params.id);
    if (!property) return res.status(404).json({ error: "Propiedad no encontrada" });
    if (await Reserva.exists({ propiedad: property._id, estado: { $ne: "cancelada" } })) {
      return res.status(409).json({ error: "No se puede eliminar una propiedad con reservas activas" });
    }
    const photos = await Foto.find({ propiedad: property._id }).lean();
    await Foto.deleteMany({ propiedad: property._id });
    await property.deleteOne();
    await removeStoredPhotoFiles(photos);
    res.json({ mensaje: "Propiedad eliminada" });
  })
);

app.use((error, _req, res, _next) => {
  console.error("Error en el API:", error);
  if (
    error?.name === "MongooseServerSelectionError" ||
    error?.name === "MongoNetworkError" ||
    error?.name === "MongoNetworkTimeoutError"
  ) {
    return res.status(503).json({
      error: "La base de datos no esta disponible. Intenta nuevamente en unos momentos.",
    });
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Cada imagen debe pesar 5 MB o menos"
        : "La solicitud puede incluir hasta 10 imagenes";
    return res.status(status).json({ error: message });
  }
  if (error?.code === "INVALID_IMAGE_TYPE") {
    return res.status(400).json({ error: error.message });
  }
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la solicitud no es JSON valido" });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: "El correo ya esta registrado" });
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Los datos enviados no son validos" });
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;

const startServer = async () => {
  await ensureDatabase();
  console.log("Conectado a la base de prueba configurada");
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://localhost:${port}`);
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el backend:", error);
    process.exitCode = 1;
  });
}
