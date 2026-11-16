import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, default: "" },
    correo: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    contrasena: { type: String, required: true, select: false },
    telefono: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    rol: {
      type: String,
      enum: ["inquilino", "anfitrion", "admin"],
      required: true,
    },
  },
  { versionKey: false, collection: "usuarios", autoIndex: false }
);

const Usuario = mongoose.model("Usuario", usuarioSchema, "usuarios");

export { Usuario };
export default Usuario;
