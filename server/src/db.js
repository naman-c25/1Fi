import mongoose from "mongoose";

/**
 * One connection for the process. Mongoose maintains its own pool, so this is
 * called once at boot and every model shares it.
 */
export async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy server/.env.example to server/.env.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    // Fail fast with a clear message instead of hanging for 30s when mongod
    // is not running.
    serverSelectionTimeoutMS: 5000,
  });

  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
