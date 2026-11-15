import {
  Foto,
  MetodoPago,
  Propiedad,
  Usuario,
} from "./models.js";
import { hashPassword } from "./auth.js";

export async function ensureTestData() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO_DATA === "false") {
    return;
  }
  if ((await MetodoPago.countDocuments()) === 0) {
    await MetodoPago.create({
      efectivo: true,
      tarjetaDebito: true,
      tarjetaCredito: true,
      transferenciaBancaria: true,
      billeteraVirtual: true,
    });
  }

  if ((await Usuario.countDocuments()) > 0) return;

  const [adminPassword, ownerPassword, customerPassword] = await Promise.all([
    hashPassword(process.env.SEED_ADMIN_PASSWORD || "admin-prueba-2026"),
    hashPassword(process.env.SEED_OWNER_PASSWORD || "anfitrion-prueba-2026"),
    hashPassword(process.env.SEED_CUSTOMER_PASSWORD || "inquilino-prueba-2026"),
  ]);
  const [admin, owner, customer] = await Usuario.create([
    {
      nombre: "Administrador",
      apellido: "Prueba",
      correo: "admin@quintasgoya.com",
      contrasena: adminPassword,
      rol: "admin",
    },
    {
      nombre: "Juan",
      apellido: "Perez",
      correo: "anfitrion@quintasgoya.com",
      contrasena: ownerPassword,
      telefono: "3794000000",
      rol: "anfitrion",
    },
    {
      nombre: "Franco",
      apellido: "Cliente de prueba",
      correo: "inquilino@quintasgoya.com",
      contrasena: customerPassword,
      telefono: "3794111111",
      rol: "inquilino",
    },
  ]);

  const properties = await Propiedad.insertMany([
    {
      propietario: owner._id,
      titulo: "Quinta Los Lapachos",
      descripcion: "Quinta con pileta, wifi y cochera para familias",
      direccion: "Zona Norte, Goya, Corrientes",
      maxHuespedes: 6,
      precioPorNoche: 85000,
      estado: "disponible",
    },
    {
      propietario: owner._id,
      titulo: "Chalet Costa del Rio",
      descripcion: "Chalet con pileta, mascotas permitidas y cochera",
      direccion: "Camino a Puerto Boca, Goya, Corrientes",
      maxHuespedes: 8,
      precioPorNoche: 120000,
      estado: "pending_review",
    },
  ]);

  await Foto.insertMany([
    {
      propiedad: properties[0]._id,
      archivo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      descripcion: "Frente de la quinta",
    },
    {
      propiedad: properties[1]._id,
      archivo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
      descripcion: "Vista del chalet",
    },
  ]);

  console.log(
    `Datos locales de prueba creados (admin ${admin.correo}, cliente ${customer.correo})`
  );
}
