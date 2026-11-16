import "dotenv/config";
import mongoose from "mongoose";
import { ensureTestData } from "./seed-data.js";

const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/goya_quintas_test";

try {
  await mongoose.connect(mongoUri);
  await ensureTestData();
  console.log("Datos de prueba disponibles.");
} catch (error) {
  console.error("No se pudieron cargar los datos de prueba:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
