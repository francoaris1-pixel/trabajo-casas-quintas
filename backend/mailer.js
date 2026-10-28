import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configuracion desde .env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=tucorreo@gmail.com
//   SMTP_PASS=clave-de-aplicacion  (en Gmail: contrasena de aplicacion, NO la normal)
//   MAIL_FROM="Casas & Quintas <tucorreo@gmail.com>"
//
// Si no hay SMTP configurado, los mails se muestran por consola (modo prueba).

const activo = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = activo
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  : null;

const fecha = (d) => new Date(d).toLocaleDateString("es-AR");

export async function enviarMail(para, asunto, html) {
  if (!activo) {
    console.log(`\n=== MAIL (modo prueba) ===\nPara: ${para}\nAsunto: ${asunto}\n${html.replace(/<[^>]+>/g, " ")}\n==========================\n`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: para,
      subject: asunto,
      html,
    });
    console.log(`Mail enviado a ${para}: ${asunto}`);
  } catch (err) {
    console.error("Error enviando mail:", err.message);
  }
}

// Mail de bienvenida al registrarse
export function mailBienvenida(usuario) {
  return {
    para: usuario.correo,
    asunto: "Bienvenido a Casas & Quintas",
    html: `
      <h2>Hola ${usuario.nombre} 👋</h2>
      <p>Tu cuenta fue creada con exito.</p>
      <ul>
        <li><b>Nombre:</b> ${usuario.nombre} ${usuario.apellido || ""}</li>
        <li><b>Correo:</b> ${usuario.correo}</li>
        ${usuario.telefono ? `<li><b>Telefono:</b> ${usuario.telefono}</li>` : ""}
      </ul>
      <p>Ya podes iniciar sesion y hacer reservas en nuestras propiedades.</p>
      <p style="color:#888">Casas & Quintas</p>
    `,
  };
}

// Mail de confirmacion de reserva con los datos y el pago
export function mailReserva({ usuario, propiedad, reserva }) {
  const noches = Math.max(
    1,
    Math.round((new Date(reserva.checkOut) - new Date(reserva.checkIn)) / 86400000)
  );
  return {
    para: usuario.correo,
    asunto: `Reserva confirmada: ${propiedad.titulo}`,
    html: `
      <h2>Reserva confirmada ✅</h2>
      <p>Hola ${usuario.nombre}, estos son los datos de tu reserva:</p>
      <table style="border-collapse:collapse" cellpadding="8">
        <tr><td style="background:#f0f4f8"><b>Propiedad</b></td><td>${propiedad.titulo}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Direccion</b></td><td>${propiedad.direccion || "-"}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Check-in</b></td><td>${fecha(reserva.checkIn)}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Check-out</b></td><td>${fecha(reserva.checkOut)}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Noches</b></td><td>${noches}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Precio por noche</b></td><td>$${propiedad.precioPorNoche.toLocaleString("es-AR")}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Monto total</b></td><td><b>$${reserva.montoTotal.toLocaleString("es-AR")}</b></td></tr>
        <tr><td style="background:#f0f4f8"><b>Metodo de pago</b></td><td>${(reserva.metodoPago || "efectivo").replace(/_/g, " ")}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Estado del pago</b></td><td>Pagado</td></tr>
      </table>
      <p>Te esperamos!</p>
      <p style="color:#888">Casas & Quintas</p>
    `,
  };
}
