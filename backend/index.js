import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import {
  Usuario,
  Propiedad,
  Reserva,
  Pago,
  Foto,
  MetodoPago,
} from "./models.js";
import { enviarMail, mailBienvenida, mailReserva } from "./mailer.js";

const app = express();
app.use(cors());
app.use(express.json());

// ---------- CONEXION MONGODB ----------
try {
  await mongoose.connect("mongodb://127.0.0.1:27017/quintas_goya");
  console.log("¡Conexión exitosa a la base de datos unificada: quintas_goya!");
} catch (error) {
  console.error("Error crítico al conectar a MongoDB:", error);
  process.exit(1);
}

// Metodo de pago inicial (se crea una sola vez)
if ((await MetodoPago.countDocuments()) === 0) {
  await MetodoPago.create({
    efectivo: true,
    tarjetaDebito: true,
    tarjetaCredito: true,
    transferenciaBancaria: true,
    billeteraVirtual: true,
  });
}

// Seed automatico: si la base esta vacia crea datos de ejemplo
if ((await Usuario.countDocuments()) === 0) {
  await Usuario.create([
    { nombre: "Administrador", correo: "admin@casas.com", contrasena: "admin123", rol: "anfitrion" },
    { nombre: "Juan", apellido: "Perez", correo: "juan@casas.com", contrasena: "pass1", rol: "anfitrion", telefono: "2664567890" },
    { nombre: "Maria", apellido: "Gomez", correo: "maria@casas.com", contrasena: "pass2", rol: "anfitrion", telefono: "2664567891" },
  ]);
  const juan = await Usuario.findOne({ correo: "juan@casas.com" });
  const maria = await Usuario.findOne({ correo: "maria@casas.com" });
  const propiedades = await Propiedad.insertMany([
    {
      propietario: juan._id,
      titulo: "Quinta Los Lapachos",
      descripcion: "Quinta con pileta, wifi y cochera para familias",
      direccion: "Zona Norte, Goya, Corrientes",
      maxHuespedes: 6,
      precioPorNoche: 85000,
      estado: "pending_review",
    },
    {
      propietario: maria._id,
      titulo: "Chalet Costa del Rio",
      descripcion: "Chalet con pileta y cochera frente al rio",
      direccion: "Camino a Puerto Boca, Goya, Corrientes",
      maxHuespedes: 8,
      precioPorNoche: 120000,
      estado: "pending_review",
    },
    {
      propietario: juan._id,
      titulo: "Cabana del Monte",
      descripcion: "Cabana con mascotas y wifi en zona rural",
      direccion: "Zona rural norte, Goya, Corrientes",
      maxHuespedes: 4,
      precioPorNoche: 60000,
      estado: "pending_review",
    },
  ]);
  await Foto.insertMany([
    {
      propiedad: propiedades[0]._id,
      archivo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      descripcion: "Frente de la quinta",
    },
    {
      propiedad: propiedades[1]._id,
      archivo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
      descripcion: "Vista del chalet",
    },
    {
      propiedad: propiedades[2]._id,
      archivo: "https://imagen-rota-ejemplo.com/cabana-del-monte.jpg",
      descripcion: "Imagen no disponible",
    },
  ]);
  console.log("Seed: usuarios y propiedades de ejemplo creados");
}

// ---------- LOGIN ----------
app.post("/api/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  const user = await Usuario.findOne({ correo, contrasena });
  if (!user) {
    return res.status(401).json({ error: "Correo o contrasena incorrectos" });
  }

  res.json({
    mensaje: `Bienvenido ${user.nombre}`,
    usuario: {
      _id: user._id,
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      rol: user.rol,
    },
  });
});

// ---------- REGISTRO ----------
// Los nuevos registros son clientes: solo pueden hacer reservas
app.post("/api/registro", async (req, res) => {
  const { nombre, apellido, correo, contrasena, telefono } = req.body;

  if (!nombre || !correo || !contrasena) {
    return res.status(400).json({ error: "Faltan datos del registro" });
  }

  if (await Usuario.findOne({ correo })) {
    return res.status(409).json({ error: "Ese correo ya esta registrado" });
  }

  const nuevo = await Usuario.create({
    nombre,
    apellido: apellido || "",
    correo,
    contrasena,
    telefono: telefono || "",
    rol: "inquilino",
  });

  res.status(201).json({
    mensaje: `Cuenta creada. Bienvenido ${nuevo.nombre}`,
    usuario: {
      id: nuevo._id,
      nombre: nuevo.nombre,
      apellido: nuevo.apellido,
      correo: nuevo.correo,
      telefono: nuevo.telefono,
      rol: nuevo.rol,
    },
  });

  // Mail de bienvenida (no bloquea la respuesta)
  const mail = mailBienvenida(nuevo);
  enviarMail(mail.para, mail.asunto, mail.html).catch(() => {});
});

// ---------- PROPIEDADES ----------
app.get("/api/propiedades", async (req, res) => {
  const propiedades = await Propiedad.find().populate(
    "propietario",
    "nombre apellido correo"
  );
  const conFoto = await Promise.all(
    propiedades.map(async (p) => {
      const foto = await Foto.findOne({ propiedad: p._id }).sort({ _id: -1 });
      return { ...p.toObject(), foto: foto?.archivo || null };
    })
  );
  res.json(conFoto);
});

// ---------- PROPIEDADES DE UN PROPIETARIO ----------
app.get("/api/propiedades/propietario/:idUsuario", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.idUsuario)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }
    const propiedades = await Propiedad.find({ propietario: req.params.idUsuario }).populate(
      "propietario",
      "nombre apellido correo"
    );
    res.json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades del propietario:", error);
    res.status(500).json({ error: "No se pudieron obtener las propiedades" });
  }
});

// ---------- RESERVAS DE UN PROPIETARIO ----------
app.get("/api/reservas/propietario/:idUsuario", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.idUsuario)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }
    const propiedades = await Propiedad.find({ propietario: req.params.idUsuario }).select("_id");
    const ids = propiedades.map((p) => p._id);
    const reservas = await Reserva.find({ propiedad: { $in: ids } })
      .populate("propiedad", "titulo precioPorNoche")
      .populate("turista", "nombre apellido telefono")
      .sort({ fechaCreacion: -1 });
    res.json(
      reservas.map((r) => ({
        id: r._id,
        propiedadId: r.propiedad?._id || r.propiedad,
        propiedadTitulo: r.propiedad?.titulo || "Propiedad",
        checkIn: r.fechaInicio,
        checkOut: r.fechaFin,
        montoTotal: r.montoTotal,
        estado: r.estado,
        turista: r.turista,
      }))
    );
  } catch (error) {
    console.error("Error al obtener reservas del propietario:", error);
    res.status(500).json({ error: "No se pudieron obtener las reservas" });
  }
});

// Detalle de una propiedad con sus fotos
app.get("/api/propiedades/:id", async (req, res) => {
  const prop = await Propiedad.findById(req.params.id).populate(
    "propietario",
    "nombre apellido correo telefono"
  );
  if (!prop) return res.status(404).json({ error: "Propiedad no encontrada" });
  res.json(prop);
});

// ---------- RESERVAS ----------
// Reservas de una propiedad (para el calendario)
app.get("/api/reservas/:propiedadId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propiedadId)) {
      return res.status(400).json({ error: "ID de propiedad invalido" });
    }
    const reservas = await Reserva.find({
      propiedad: req.params.propiedadId,
      estado: { $ne: "cancelada" },
    }).populate("turista", "nombre apellido");
    res.json(
      reservas.map((r) => ({
        id: r._id,
        propiedadId: r.propiedad,
        checkIn: r.fechaInicio,
        checkOut: r.fechaFin,
        estado: r.estado,
      }))
    );
  } catch (error) {
    console.error("Error al obtener reservas de la propiedad:", error);
    res.status(500).json({ error: "No se pudieron obtener las reservas" });
  }
});

// Crear reserva (valida solapamiento y calcula el monto total)
app.post("/api/reservas", async (req, res) => {
  const { propiedadId, checkIn, checkOut, datosTurista, metodoPago } = req.body;

  if (!propiedadId || !checkIn || !checkOut) {
    return res.status(400).json({ error: "Faltan datos de la reserva" });
  }
  if (new Date(checkIn) >= new Date(checkOut)) {
    return res.status(400).json({ error: "Las fechas son invalidas" });
  }

  const propiedad = await Propiedad.findById(propiedadId);
  if (!propiedad)
    return res.status(404).json({ error: "Propiedad no encontrada" });
  if (!["disponible", "pending_review"].includes(propiedad.estado)) {
    return res.status(409).json({ error: "La propiedad no esta disponible" });
  }

  // No permitir reservas que se superpongan con otras activas
  const superpuesta = await Reserva.findOne({
    propiedad: propiedadId,
    estado: { $ne: "cancelada" },
    fechaInicio: { $lt: new Date(checkOut) },
    fechaFin: { $gt: new Date(checkIn) },
  });
  if (superpuesta) {
    return res
      .status(409)
      .json({ error: "Esas fechas ya estan reservadas. Elegi otras fechas." });
  }

  // Turista: si hay usuario logueado se usa su id; si no, se crea/usa uno por correo
  let turistaId = req.body.turistaId;
  if (!turistaId) {
    const { nombre, correo } = datosTurista || {};
    if (!nombre || !correo) {
      return res
        .status(400)
        .json({ error: "Faltan datos del turista (nombre y correo)" });
    }
    let u = await Usuario.findOne({ correo });
    if (!u) {
      u = await Usuario.create({
        nombre,
        correo,
        contrasena: "sin-password",
        rol: "inquilino",
      });
    }
    turistaId = u._id;
  }

  const noches = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  const reserva = await Reserva.create({
    propiedad: propiedadId,
    turista: turistaId,
    fechaInicio: checkIn,
    fechaFin: checkOut,
    montoTotal: noches * propiedad.precioPorNoche,
    estado: "confirmada",
  });

  // Registra el pago de la reserva
  const pago = await Pago.create({
    reserva: reserva._id,
    montoPagado: reserva.montoTotal,
    metodoPago: metodoPago || "efectivo",
    estado: "pagado",
  });

  res.status(201).json({
    mensaje: "Reserva registrada",
    reserva,
    pago: { id: pago._id, monto: pago.montoPagado, metodoPago: pago.metodoPago, estado: pago.estado },
  });

  // Mail de confirmacion con los datos y el pago (no bloquea la respuesta)
  const turista = await Usuario.findById(turistaId);
  if (turista) {
    const mail = mailReserva({ usuario: turista, propiedad, reserva });
    enviarMail(mail.para, mail.asunto, mail.html).catch(() => {});
  }
});

// ---------- PROPIETARIO ----------
// Middleware simple: verifica usuario propietario
async function authPropietario(req, res, next) {
  const usuario = await Usuario.findById(req.headers["x-usuario-id"]);
  if (!usuario || usuario.rol !== "anfitrion") {
    return res.status(403).json({ error: "Solo anfitriones" });
  }
  req.usuario = usuario;
  next();
}

// Panel propio: sus propiedades + reservas + estadisticas
app.get("/api/propietario/panel", authPropietario, async (req, res) => {
  const susPropiedades = await Propiedad.find({ propietario: req.usuario._id });
  const ids = susPropiedades.map((p) => p._id);
  const susReservas = await Reserva.find({
    propiedad: { $in: ids },
  })
    .populate("propiedad", "titulo precioPorNoche")
    .populate("turista", "nombre apellido telefono");

  const estadisticas = susPropiedades.map((p) => {
    const rs = susReservas.filter(
      (r) => String(r.propiedad?._id) === String(p._id)
    );
    const noches = rs.reduce(
      (t, r) =>
        t + Math.max(1, Math.round((r.fechaFin - r.fechaInicio) / 86400000)),
      0
    );
    return {
      propiedadId: p._id,
      titulo: p.titulo,
      precioPorNoche: p.precioPorNoche,
      reservas: rs.length,
      noches,
      ingresos: noches * p.precioPorNoche,
      comision: noches * p.precioPorNoche * 0.1,
      liquidacion: noches * p.precioPorNoche * 0.9,
    };
  });

  res.json({
    propiedades: susPropiedades,
    reservas: susReservas,
    estadisticas,
  });
});

// El propietario edita SOLO sus propiedades
app.put("/api/propietario/propiedades/:id", authPropietario, async (req, res) => {
  const prop = await Propiedad.findOne({
    _id: req.params.id,
    propietario: req.usuario._id,
  });
  if (!prop) return res.status(404).json({ error: "Propiedad no encontrada" });

  const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado } =
    req.body;
  if (titulo) prop.titulo = titulo;
  if (descripcion) prop.descripcion = descripcion;
  if (direccion) prop.direccion = direccion;
  if (maxHuespedes) prop.maxHuespedes = Number(maxHuespedes);
  if (estado) prop.estado = estado;
  if (precioPorNoche !== undefined && precioPorNoche !== "") {
    const precio = Number(precioPorNoche);
    if (Number.isNaN(precio) || precio < 0) {
      return res.status(400).json({ error: "Precio invalido" });
    }
    prop.precioPorNoche = precio;
  }
  await prop.save();

  res.json({ mensaje: `Propiedad "${prop.titulo}" actualizada`, propiedad: prop });
});

// ---------- ADMIN ----------
app.get("/api/admin/panel", async (req, res) => {
  const [propiedades, reservas] = await Promise.all([
    Propiedad.find().populate("propietario", "nombre apellido correo"),
    Reserva.find().populate("propiedad", "titulo").populate("turista", "nombre apellido"),
  ]);
  res.json({ propiedades, reservas });
});

app.put("/api/admin/propiedades/:id", async (req, res) => {
  const prop = await Propiedad.findById(req.params.id);
  if (!prop) return res.status(404).json({ error: "Propiedad no encontrada" });

  const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado } =
    req.body;
  if (titulo) prop.titulo = titulo;
  if (descripcion) prop.descripcion = descripcion;
  if (direccion) prop.direccion = direccion;
  if (maxHuespedes) prop.maxHuespedes = Number(maxHuespedes);
  if (estado) prop.estado = estado;
  if (precioPorNoche !== undefined && precioPorNoche !== "") {
    const precio = Number(precioPorNoche);
    if (Number.isNaN(precio) || precio < 0) {
      return res.status(400).json({ error: "Precio invalido" });
    }
    prop.precioPorNoche = precio;
  }
  await prop.save();

  res.json({ mensaje: `Propiedad "${prop.titulo}" actualizada`, propiedad: prop });
});

app.post("/api/admin/propiedades", async (req, res) => {
  const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado, propietarioId } =
    req.body;

  if (!titulo || precioPorNoche === undefined) {
    return res.status(400).json({ error: "Faltan datos de la propiedad" });
  }
  const precio = Number(precioPorNoche);
  if (Number.isNaN(precio) || precio < 0) {
    return res.status(400).json({ error: "Precio invalido" });
  }

  // Si no indican propietario, se usa el primero con ese rol
  let propId = propietarioId;
  if (!propId) {
    const p = await Usuario.findOne({ rol: "anfitrion" });
    propId = p?._id;
  }

  const nueva = await Propiedad.create({
    propietario: propId,
    titulo,
    descripcion: descripcion || "",
    direccion: direccion || "",
    maxHuespedes: maxHuespedes || 4,
    precioPorNoche: precio,
    estado: estado || "disponible",
  });

  res.status(201).json({ mensaje: `Propiedad "${titulo}" publicada`, propiedad: nueva });
});

app.delete("/api/admin/propiedades/:id", async (req, res) => {
  const prop = await Propiedad.findByIdAndDelete(req.params.id);
  if (!prop) return res.status(404).json({ error: "Propiedad no encontrada" });
  res.json({ mensaje: `Propiedad "${prop.titulo}" eliminada` });
});

// ---------- SEED (datos de ejemplo) ----------
app.post("/api/seed", async (req, res) => {
  res.json({ mensaje: "El seed corre automatico al iniciar el servidor" });
});

// ---------- PROPIEDADES (creacion con control de rol) ----------
app.post("/api/propiedades", async (req, res) => {
  try {
  const usuarioId = req.headers["x-usuario-id"] || req.body.usuarioId;
  if (!usuarioId) return res.status(401).json({ error: "Falta identificacion de usuario" });
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
  if (usuario.rol !== "anfitrion") return res.status(403).json({ error: "No tenes permisos para publicar propiedades" });
  const { titulo, descripcion, direccion, maxHuespedes, precioPorNoche, estado, foto } = req.body;
  if (!titulo || precioPorNoche === undefined) return res.status(400).json({ error: "Faltan datos de la propiedad" });
  const precio = Number(precioPorNoche);
  if (Number.isNaN(precio) || precio < 0) return res.status(400).json({ error: "Precio invalido" });
  const nueva = await Propiedad.create({
    propietario: usuario._id,
    titulo,
    descripcion: descripcion || "",
    direccion: direccion || "",
    maxHuespedes: maxHuespedes || 4,
    precioPorNoche: precio,
    estado: estado || "pending_review",
  });
  if (foto) await Foto.create({ propiedad: nueva._id, archivo: foto, descripcion: "Foto principal" });
  res.status(201).json({ mensaje: `Propiedad "${titulo}" publicada`, propiedad: nueva });
  } catch (error) { console.error("Error al publicar la propiedad:", error); res.status(500).json({ error: "No se pudo publicar la propiedad" }); }
});

// ---------- RESERVAS POR TURISTA ----------
app.get("/api/reservas/turista/:turistaId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.turistaId)) {
      return res.status(400).json({ error: "ID de usuario invalido" });
    }
    const reservas = await Reserva.find({ turista: req.params.turistaId }).populate("propiedad", "titulo direccion precioPorNoche").sort({ fechaCreacion: -1 });
    res.json(reservas.map((r) => ({
      id: r._id,
      propiedadId: r.propiedad?._id || r.propiedad,
      propiedadTitulo: r.propiedad?.titulo || "Propiedad",
      checkIn: r.fechaInicio,
      checkOut: r.fechaFin,
      montoTotal: r.montoTotal,
      estado: r.estado,
    })));
  } catch (error) {
    console.error("Error al obtener reservas del turista:", error);
    res.status(500).json({ error: "No se pudieron obtener las reservas" });
  }
});

// ---------- CANCELAR RESERVA ----------
app.put("/api/reservas/:id/cancelar", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID de reserva invalido" });
    }
    const { turistaId } = req.body;
    if (!turistaId) return res.status(400).json({ error: "Falta identificacion de usuario" });
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) return res.status(404).json({ error: "Reserva no encontrada" });
    if (String(reserva.turista) !== String(turistaId)) return res.status(403).json({ error: "No podes cancelar una reserva de otro usuario" });
    if (reserva.estado === "cancelada") return res.status(409).json({ error: "La reserva ya esta cancelada" });
    reserva.estado = "cancelada";
    await reserva.save();
    res.json({ mensaje: "Reserva cancelada correctamente", reserva });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error);
    res.status(500).json({ error: "No se pudo cancelar la reserva" });
  }
});

// ---------- ADMINISTRACION ----------
app.get("/api/admin/propietarios", async (req, res) => {
  try {
    const anfitriones = await Usuario.find({ rol: "anfitrion" }).select("nombre apellido correo telefono");
    const conteos = await Propiedad.aggregate([{ $group: { _id: "$propietario", count: { $sum: 1 } } }]);
    const mapa = new Map(conteos.map((c) => [String(c._id), c.count]));
    res.json(anfitriones.map((u) => ({
      _id: u._id,
      nombre: u.nombre,
      apellido: u.apellido,
      correo: u.correo,
      telefono: u.telefono,
      propiedades: mapa.get(String(u._id)) || 0,
    })));
  } catch (error) {
    console.error("Error al obtener propietarios:", error);
    res.status(500).json({ error: "No se pudieron obtener los propietarios" });
  }
});

app.get("/api/admin/propiedades", async (req, res) => {
  try {
    const propiedades = await Propiedad.find().populate("propietario", "nombre apellido correo telefono").sort({ createdAt: -1 });
    res.json(propiedades);
  } catch (error) {
    console.error("Error al obtener propiedades (admin):", error);
    res.status(500).json({ error: "No se pudieron obtener las propiedades" });
  }
});
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});






