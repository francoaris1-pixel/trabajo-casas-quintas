import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, default: "" },
    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contrasena: { type: String, required: true, select: false },
    telefono: { type: String, default: "" },
    rol: {
      type: String,
      enum: ["inquilino", "anfitrion", "admin"],
      required: true,
    },
  },
  { versionKey: false, collection: "usuarios" }
);

const Usuario = mongoose.model("Usuario", usuarioSchema, "usuarios");

export { Usuario };
export default Usuario;


