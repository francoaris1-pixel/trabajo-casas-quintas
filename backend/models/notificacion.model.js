import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    mensaje: { type: String, required: true },
    canal: { type: String, required: true },
    leida: { type: Boolean, default: false },
    fecha: { type: Date, default: Date.now },
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
