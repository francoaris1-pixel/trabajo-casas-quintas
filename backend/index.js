import "dotenv/config";
import { pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";
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
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN ||
      (process.env.NODE_ENV === "production" ? false : true),
  })
);
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
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const contrasena = String(req.body.contrasena || "");
    if (!validEmail.test(correo) || !contrasena) {
      return res.status(400).json({ error: "Correo y contrasena son obligatorios" });
    }

    const user = await Usuario.findOne({ correo }).select("+contrasena");
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
    const nombre = String(req.body.nombre || "").trim();
    const apellido = String(req.body.apellido || "").trim();
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const contrasena = String(req.body.contrasena || "");
    const telefono = String(req.body.telefono || "").trim();
    if (!nombre || !validEmail.test(correo) || contrasena.length < 8) {
      return res.status(400).json({
        error: "Ingresa nombre, correo valido y contrasena de al menos 8 caracteres",
      });
    }
    if (await Usuario.exists({ correo })) {
      return res.status(409).json({ error: "Ese correo ya esta registrado" });
    }

    const user = await Usuario.create({
      nombre,
      apellido,
      correo,
      contrasena: await hashPassword(contrasena),
      telefono,
      rol: "inquilino",
    });
    res.status(201).json({
      mensaje: `Cuenta creada. Bienvenido ${user.nombre}`,
      usuario: publicUser(user),
      token: createToken(user._id),
    });
    const mail = mailBienvenida(user);
    void enviarMail(mail.para, mail.asunto, mail.html).catch((error) =>
      console.error("No se pudo enviar el mail de bienvenida:", error.message)
    );
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
    const withPhotos = await Promise.all(
      properties.map(async (property) => {
        const photo = await Foto.findOne({ propiedad: property._id })
          .sort({ _id: -1 })
          .lean();
        return { ...property, foto: photo?.archivo || null };
      })
    );
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
    const mail = mailReserva({
      usuario: req.user,
      propiedad: property,
      reserva: reservation,
      metodoPago,
    });
    void enviarMail(mail.para, mail.asunto, mail.html).catch((error) =>
      console.error("No se pudo enviar el mail de reserva:", error.message)
    );
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
    await Promise.all([
      Foto.deleteMany({ propiedad: property._id }),
      property.deleteOne(),
    ]);
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
    const withPhotos = await Promise.all(
      properties.map(async (property) => {
        const photo = await Foto.findOne({ propiedad: property._id }).lean();
        return { ...property, foto: photo?.archivo || null };
      })
    );
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
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const property = await Propiedad.findById(req.params.id);
    if (!property) return res.status(404).json({ error: "Propiedad no encontrada" });
    const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado } =
      req.body;
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
    if (estado !== undefined) {
      if (!["pending_review", "disponible", "suspendida"].includes(estado)) {
        return res.status(400).json({ error: "Estado de propiedad invalido" });
      }
      property.estado = estado;
    }
    await property.save();
    res.json({ mensaje: "Propiedad actualizada", propiedad: property });
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
    await Promise.all([
      Foto.deleteMany({ propiedad: property._id }),
      property.deleteOne(),
    ]);
    res.json({ mensaje: "Propiedad eliminada" });
  })
);

app.use((error, _req, res, _next) => {
  console.error("Error en el API:", error);
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
