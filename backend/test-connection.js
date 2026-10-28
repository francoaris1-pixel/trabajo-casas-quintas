import mongoose from "mongoose";

const uri = "mongodb://127.0.0.1:27017/quintas_goya";

try {
  await mongoose.connect(uri);
  console.log("Conectado a", uri);

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