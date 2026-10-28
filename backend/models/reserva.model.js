import mongoose from "mongoose";

const reservaSchema = new mongoose.Schema(
  {
    propiedad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Propiedad",
      required: true,
    },
    turista: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    montoTotal: { type: Number, default: 0, min: 0 },
    estado: { type: String, default: "pendiente" },
    fechaCreacion: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "reservas" }
);

const Reserva = mongoose.model("Reserva", reservaSchema, "reservas");

export { Reserva };
export default Reserva;



