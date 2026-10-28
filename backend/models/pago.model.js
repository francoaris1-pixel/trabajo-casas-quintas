import mongoose from "mongoose";

const pagoSchema = new mongoose.Schema(
  {
    reserva: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reserva",
      required: true,
    },
    montoPagado: { type: Number, required: true, min: 0 },
    fechaPago: { type: Date, default: Date.now },
    metodoPago: { type: String, default: "efectivo" },
    estado: { type: String, default: "pendiente" },
  },
  { versionKey: false, collection: "pagos" }
);

const Pago = mongoose.model("Pago", pagoSchema);

export { Pago };
export default Pago;


