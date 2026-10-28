import mongoose from "mongoose";
import {
  Usuario,
  Propiedad,
  Foto,
  Reserva,
  Pago,
  Reporte,
  Liquidacion,
  Resena,
  MetodoPago,
} from "./models.js";

const uri = "mongodb+srv://francoaris72_db_user:goya12345@cluster0.l79b1bz.mongodb.net/quintas_goya?retryWrites=true&w=majority";

async function seed() {
  try {
    await mongoose.connect(uri);
    console.log("Conectado a", uri);

    // Limpieza previa para que el seed sea repetible
    await Promise.all([
      Usuario.deleteMany({}),
      Propiedad.deleteMany({}),
      Foto.deleteMany({}),
      Reserva.deleteMany({}),
      Pago.deleteMany({}),
      Reporte.deleteMany({}),
      Liquidacion.deleteMany({}),
      Resena.deleteMany({}),
      MetodoPago.deleteMany({}),
    ]);

    const admin = await Usuario.create({
      nombre: "Administrador",
      apellido: "Maestro",
      correo: "admin@quintasgoya.com",
      contrasena: "admin123",
      telefono: "",
      rol: "admin",
    });

    const anfitrion = await Usuario.create({
      nombre: "Franco Hugo",
      apellido: "Aristiqui",
      correo: "franco.anfitrion@quintasgoya.com",
      contrasena: "admin123",
      telefono: "3794000000",
      rol: "anfitrion",
    });

    const inquilino = await Usuario.create({
      nombre: "Franco",
      apellido: "Hugo Aristiqui",
      correo: "franco.inquilino@quintasgoya.com",
      contrasena: "inquilino123",
      telefono: "3794111111",
      rol: "inquilino",
    });

    const propiedad = await Propiedad.create({
      propietario: anfitrion._id,
      titulo: "Quinta Los Lapachos",
      descripcion: "Quinta en Goya con pileta, wifi y cochera para familias",
      direccion: "Zona Norte, Goya, Corrientes",
      maxHuespedes: 6,
      precioPorNoche: 85000,
      estado: "pending_review",
    });

    await Foto.create({
      propiedad: propiedad._id,
      archivo:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      descripcion: "Frente de la quinta",
    });

    const metodoPago = await MetodoPago.create({
      efectivo: true,
      tarjetaDebito: true,
      tarjetaCredito: true,
      transferenciaBancaria: true,
      billeteraVirtual: true,
    });

    const reserva = await Reserva.create({
      propiedad: propiedad._id,
      turista: inquilino._id,
      fechaInicio: new Date("2026-11-01T00:00:00.000Z"),
      fechaFin: new Date("2026-11-05T00:00:00.000Z"),
      montoTotal: 4 * propiedad.precioPorNoche,
      estado: "confirmada",
      fechaCreacion: new Date(),
    });

    await Pago.create({
      reserva: reserva._id,
      montoPagado: reserva.montoTotal,
      fechaPago: new Date(),
      metodoPago: metodoPago._id,
      estado: "pagado",
    });

    const reporte = await Reporte.create({
      propietario: anfitrion._id,
      periodo: "2026-11",
      cantidadReservas: 1,
      ingresosTotales: reserva.montoTotal,
      montoTotalLiquidar: reserva.montoTotal * 0.9,
      fechaGeneracion: new Date(),
    });

    await Liquidacion.create({
      reporte: reporte._id,
      montoLiquidar: reporte.montoTotalLiquidar,
      fechaLiquidacion: new Date(),
      estado: "pendiente",
      metodoPago: "transferencia_bancaria",
    });

    await Resena.create({
      reserva: reserva._id,
      calificacion: 5,
      comentario: "Excelente quinta, muy recomendable.",
      fechaPublicacion: new Date(),
    });

    console.log("Seed completado: 9 entidades pobladas en quintas_goya");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el seed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
