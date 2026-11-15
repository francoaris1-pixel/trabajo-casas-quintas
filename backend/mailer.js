import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configuracion desde .env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=tucorreo@gmail.com
//   SMTP_PASS=clave-de-aplicacion  (en Gmail: contrasena de aplicacion, NO la normal)
//   MAIL_FROM="Goya Recibe <tucorreo@gmail.com>"
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
const escaparHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export async function enviarMail(para, asunto, html) {
  if (!activo) {
    console.log(`\n=== MAIL (modo prueba) ===\nPara: ${para}\nAsunto: ${asunto}\n${html.replace(/<[^>]+>/g, " ")}\n==========================\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: para,
    subject: asunto,
    html,
  });
  console.log(`Mail enviado a ${para}: ${asunto}`);
}

// Mail de bienvenida al registrarse
export function mailBienvenida(usuario) {
  return {
    para: usuario.correo,
    asunto: "Bienvenido a Goya Recibe",
    html: `
      <h2>Hola ${escaparHtml(usuario.nombre)} 👋</h2>
      <p>Tu cuenta fue creada con exito.</p>
      <ul>
        <li><b>Nombre:</b> ${escaparHtml(usuario.nombre)} ${escaparHtml(usuario.apellido)}</li>
        <li><b>Correo:</b> ${escaparHtml(usuario.correo)}</li>
        ${usuario.telefono ? `<li><b>Telefono:</b> ${escaparHtml(usuario.telefono)}</li>` : ""}
      </ul>
      <p>Ya podes iniciar sesion y hacer reservas en nuestras propiedades.</p>
      <p style="color:#888">Goya Recibe</p>
    `,
  };
}

// Mail de confirmacion de reserva con los datos y el pago
export function mailReserva({ usuario, propiedad, reserva, metodoPago }) {
  const noches = Math.max(
    1,
    Math.round((new Date(reserva.checkOut) - new Date(reserva.checkIn)) / 86400000)
  );
  return {
    para: usuario.correo,
    asunto: `Solicitud de reserva: ${propiedad.titulo}`,
    html: `
      <h2>Solicitud de reserva recibida</h2>
      <p>Hola ${escaparHtml(usuario.nombre)}, estos son los datos de tu reserva:</p>
      <table style="border-collapse:collapse" cellpadding="8">
        <tr><td style="background:#f0f4f8"><b>Propiedad</b></td><td>${escaparHtml(propiedad.titulo)}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Direccion</b></td><td>${escaparHtml(propiedad.direccion || "-")}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Check-in</b></td><td>${fecha(reserva.checkIn)}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Check-out</b></td><td>${fecha(reserva.checkOut)}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Noches</b></td><td>${noches}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Precio por noche</b></td><td>$${propiedad.precioPorNoche.toLocaleString("es-AR")}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Monto total</b></td><td><b>$${reserva.montoTotal.toLocaleString("es-AR")}</b></td></tr>
        <tr><td style="background:#f0f4f8"><b>Metodo de pago</b></td><td>${escaparHtml((metodoPago || "efectivo").replace(/_/g, " "))}</td></tr>
        <tr><td style="background:#f0f4f8"><b>Estado</b></td><td>Pendiente de confirmacion y pago</td></tr>
      </table>
      <p>La reserva y el pago aun requieren confirmacion.</p>
      <p style="color:#888">Goya Recibe</p>
    `,
  };
}
