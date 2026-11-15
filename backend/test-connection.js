import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;

try {
  if (!uri) throw new Error("Falta configurar MONGO_URI en el entorno");
  await mongoose.connect(uri);
  console.log("Conectado a MongoDB");

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Colecciones disponibles:");
  if (collections.length === 0) {
    console.log("- (sin colecciones)");
  } else {
    collections.forEach((collection) => console.log("-", collection.name));
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("Error critico al conectar a MongoDB:", error);
  process.exit(1);
}