import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    tipo: { type: String, required: true },
    mensaje: { type: String, required: true },
    reserva: { type: mongoose.Schema.Types.ObjectId, ref: "Reserva" },
    propiedad: { type: mongoose.Schema.Types.ObjectId, ref: "Propiedad" },
    leida: { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "notificaciones" }
);

const Notificacion = mongoose.model(
  "Notificacion",
  notificacionSchema,
  "notificaciones"
);

export { Notificacion };
export default Notificacion;
