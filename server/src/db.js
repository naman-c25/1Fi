import mongoose from "mongoose";

/** Used when the connection string does not name a database. */
export const DEFAULT_DB_NAME = "onefi";

/**
 * True when the URI has no database in its path.
 *
 * The connection string Atlas gives you in the "Connect" dialog looks like
 * `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?appName=Cluster0` —
 * no database name at all. Mongo silently falls back to `test`, so the app
 * connects successfully and then serves an empty catalogue, which looks like
 * a broken app rather than a misconfigured URI.
 */
function hasNoDatabaseName(uri) {
  try {
    // The mongodb+srv:// scheme parses fine as a URL; the db is the pathname.
    const path = new URL(uri).pathname;
    return path === "" || path === "/";
  } catch {
    return false;
  }
}

/**
 * One connection for the process. Mongoose maintains its own pool, so this is
 * called once at boot and every model shares it.
 */
export async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy server/.env.example to server/.env.");
  }

  mongoose.set("strictQuery", true);

  const options = {
    // Fail fast with a clear message instead of hanging when mongod is down or
    // the Atlas IP allow-list is blocking us.
    serverSelectionTimeoutMS: 8000,
  };

  if (hasNoDatabaseName(uri)) {
    options.dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
    console.warn(
      `MONGODB_URI names no database; using "${options.dbName}". ` +
        `Add it to the URI to be explicit, e.g. ...mongodb.net/${options.dbName}?retryWrites=true`,
    );
  }

  await mongoose.connect(uri, options);

  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
