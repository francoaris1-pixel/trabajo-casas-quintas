import mongoose from "mongoose";

const logAuditoriaSchema = new mongoose.Schema(
  {
    usuario: { type: String, required: true },
    rol: { type: String, required: true },
    accion: { type: String, required: true },
    detalle: { type: String, required: true },
    ip: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "logs_auditoria" }
);

const LogAuditoria = mongoose.model(
  "LogAuditoria",
  logAuditoriaSchema,
  "logs_auditoria"
);

export { LogAuditoria };
export default LogAuditoria;
