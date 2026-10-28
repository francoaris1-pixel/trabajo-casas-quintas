import mongoose from "mongoose";

const metodoPagoSchema = new mongoose.Schema(
  {
    efectivo: { type: Boolean, default: false },
    tarjetaDebito: { type: Boolean, default: false },
    tarjetaCredito: { type: Boolean, default: false },
    transferenciaBancaria: { type: Boolean, default: false },
    billeteraVirtual: { type: Boolean, default: false },
  },
  { versionKey: false, collection: "metodosPago" }
);

const MetodoPago = mongoose.model("MetodoPago", metodoPagoSchema, "metodosPago");

export { MetodoPago };
export default MetodoPago;



