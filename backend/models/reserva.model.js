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
    fechaInicio: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.fechaFin || value < this.fechaFin;
        },
        message: "La fecha de inicio debe ser anterior a la fecha de fin",
      },
    },
    fechaFin: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.fechaInicio || value > this.fechaInicio;
        },
        message: "La fecha de fin debe ser posterior a la fecha de inicio",
      },
    },
    montoTotal: { type: Number, default: 0, min: 0 },
    estado: {
      type: String,
      enum: ["pendiente", "confirmada", "cancelada"],
      default: "pendiente",
    },
    fechaCreacion: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "reservas" }
);

reservaSchema.index({ propiedad: 1, fechaInicio: 1, fechaFin: 1, estado: 1 });

const Reserva = mongoose.model("Reserva", reservaSchema, "reservas");

export { Reserva };
export default Reserva;


