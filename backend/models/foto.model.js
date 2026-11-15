import mongoose from "mongoose";

const fotoSchema = new mongoose.Schema(
  {
    propiedad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Propiedad",
      required: true,
    },
    archivo: { type: String, required: true },
    descripcion: { type: String, default: "" },
  },
  { versionKey: false, collection: "fotos" }
);

const Foto = mongoose.model("Foto", fotoSchema, "fotos");

export { Foto };
export default Foto;



