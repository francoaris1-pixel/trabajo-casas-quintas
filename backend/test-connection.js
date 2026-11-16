import "dotenv/config";
import mongoose from "mongoose";

const uri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/goya_quintas_test";

try {
  await mongoose.connect(uri);
  console.log("Conectado a la base configurada.");

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Colecciones disponibles:");
  if (collections.length === 0) {
    console.log("- (sin colecciones)");
  } else {
    collections.forEach((collection) => console.log("-", collection.name));
  }
} catch (error) {
  console.error("Error critico al conectar a MongoDB:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}