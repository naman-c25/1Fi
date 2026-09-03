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
 * On a long-lived server this runs once at boot. On a serverless platform the
 * module is re-evaluated per cold start and several invocations can share one
 * warm container, so the *promise* is cached on globalThis: concurrent
 * invocations await the same handshake instead of each opening a socket and
 * exhausting the Atlas connection limit.
 */
const globalForMongoose = globalThis;
globalForMongoose.__onefiMongo ??= { promise: null };

export async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Locally: copy server/.env.example to server/.env. " +
        "On Vercel/Render: add it under the project's Environment Variables.",
    );
  }

  // Already connected on this warm container.
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!globalForMongoose.__onefiMongo.promise) {
    mongoose.set("strictQuery", true);

    const options = {
      // Fail fast with a clear message instead of hanging when mongod is down
      // or the Atlas IP allow-list is blocking us.
      serverSelectionTimeoutMS: 8000,
    };

    if (hasNoDatabaseName(uri)) {
      options.dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
      console.warn(
        `MONGODB_URI names no database; using "${options.dbName}". ` +
          `Add it to the URI to be explicit, e.g. ...mongodb.net/${options.dbName}?retryWrites=true`,
      );
    }

    globalForMongoose.__onefiMongo.promise = mongoose.connect(uri, options).catch((error) => {
      // Let the next invocation retry rather than caching a failed handshake
      // for the life of the container.
      globalForMongoose.__onefiMongo.promise = null;
      throw error;
    });
  }

  await globalForMongoose.__onefiMongo.promise;
  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  globalForMongoose.__onefiMongo.promise = null;
  await mongoose.disconnect();
}
