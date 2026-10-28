import mongoose from "mongoose";

const reporteSchema = new mongoose.Schema(
  {
    propietario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    periodo: { type: String, required: true },
    cantidadReservas: { type: Number, default: 0, min: 0 },
    ingresosTotales: { type: Number, default: 0, min: 0 },
    montoTotalLiquidar: { type: Number, default: 0, min: 0 },
    fechaGeneracion: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "reportes" }
);

const Reporte = mongoose.model("Reporte", reporteSchema);

export { Reporte };
export default Reporte;


