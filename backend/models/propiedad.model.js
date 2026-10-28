import mongoose from "mongoose";

const propiedadSchema = new mongoose.Schema(
  {
    propietario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    direccion: { type: String, default: "" },
    maxHuespedes: { type: Number, default: 1, min: 1 },
    precioPorNoche: { type: Number, required: true, min: 0 },
    estado: { type: String, default: "pending_review" },
  },
  { versionKey: false, collection: "propiedades" }
);

const Propiedad = mongoose.model("Propiedad", propiedadSchema, "propiedades");

export { Propiedad };
export default Propiedad;



