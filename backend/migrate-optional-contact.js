import "dotenv/config";
import mongoose from "mongoose";

const normalizePhone = (value) => value.trim().replace(/[^\d+]/g, "");
const normalizeEmail = (value) => value.trim().toLowerCase();

const normalizeExistingValues = async (collection, field, normalize) => {
  const documents = await collection
    .find({ [field]: { $type: "string" } }, { projection: { _id: 1, [field]: 1 } })
    .toArray();
  const normalizedValues = new Map();
  for (const document of documents) {
    const value = normalize(document[field]);
    if (!value) continue;
    const existingId = normalizedValues.get(value);
    if (existingId && !existingId.equals(document._id)) {
      throw new Error(`Duplicate ${field} values would prevent a unique index`);
    }
    normalizedValues.set(value, document._id);
  }

  for (const document of documents) {
    const value = normalize(document[field]);
    if (value) {
      await collection.updateOne({ _id: document._id }, { $set: { [field]: value } });
    } else {
      await collection.updateOne({ _id: document._id }, { $unset: { [field]: "" } });
    }
  }
  await collection.updateMany({ [field]: null }, { $unset: { [field]: "" } });
};

const ensureSparseUniqueIndex = async (collection, field) => {
  const indexes = await collection.indexes();
  const currentIndex = indexes.find(
    (index) => Object.keys(index.key).length === 1 && index.key[field] === 1
  );
  if (currentIndex && (!currentIndex.unique || !currentIndex.sparse)) {
    await collection.dropIndex(currentIndex.name);
  }
  await collection.createIndex(
    { [field]: 1 },
    { unique: true, sparse: true, name: `${field}_1` }
  );
};

try {
  const mongoUri =
    process.env.MONGODB_URI ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "mongodb://127.0.0.1:27017/goya_quintas_test");
  if (!mongoUri) throw new Error("MONGODB_URI es obligatorio en produccion");
  await mongoose.connect(mongoUri);

  const users = mongoose.connection.collection("usuarios");
  await normalizeExistingValues(users, "correo", normalizeEmail);
  await normalizeExistingValues(users, "telefono", normalizePhone);
  await ensureSparseUniqueIndex(users, "correo");
  await ensureSparseUniqueIndex(users, "telefono");
  console.log("Indices opcionales y unicos de correo y telefono actualizados.");
} catch (error) {
  console.error("No se pudieron actualizar los indices de contacto:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
