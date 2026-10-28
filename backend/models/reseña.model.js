import mongoose from "mongoose";

const resenaSchema = new mongoose.Schema(
  {
    reserva: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reserva",
      required: true,
      unique: true,
    },
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, default: "" },
    fechaPublicacion: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "resenas" }
);

const Resena = mongoose.model("Resena", resenaSchema, "reseñas");

export { Resena };
export default Resena;



