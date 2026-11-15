import mongoose from "mongoose";

const liquidacionSchema = new mongoose.Schema(
  {
    reporte: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reporte",
      required: true,
    },
    montoLiquidar: { type: Number, required: true, min: 0 },
    fechaLiquidacion: { type: Date, default: Date.now },
    estado: { type: String, default: "pendiente" },
    metodoPago: { type: String, default: "transferencia_bancaria" },
  },
  { versionKey: false, collection: "liquidaciones" }
);

const Liquidacion = mongoose.model("Liquidacion", liquidacionSchema, "liquidaciones");

export { Liquidacion };
export default Liquidacion;



