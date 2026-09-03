/**
 * Local development / any long-lived Node host (Render, Railway, a VM).
 *
 * Vercel does not use this file — it runs `api/index.js` as a serverless
 * function, where listening on a port is not how requests arrive.
 */

import "dotenv/config";

import { app } from "./app.js";
import { connectToDatabase } from "./db.js";

const PORT = Number(process.env.PORT ?? 4000);

async function start() {
  try {
    const connection = await connectToDatabase(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.host}/${connection.name}`);
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    console.error("Is mongod running, and is MONGODB_URI correct in server/.env?");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}/api`);
  });
}

start();
