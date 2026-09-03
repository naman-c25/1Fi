import "dotenv/config";

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import { connectToDatabase } from "./db.js";
import { fail, ok } from "./lib/http.js";
import { emiApplicationsRouter } from "./routes/emiApplications.js";
import { productsRouter } from "./routes/products.js";
import { EmiApplication } from "./models/EmiApplication.js";
import { MutualFund } from "./models/MutualFund.js";
import { Product } from "./models/Product.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = express();

// The client is served from a different origin in production (and from Vite's
// dev server locally), so it needs to be allow-listed explicitly.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and curl send no Origin header at all.
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGIN.`));
    },
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api — a self-describing index of the available endpoints. */
app.get("/api", (_req, res) =>
  ok(res, {
    name: "1Fi EMI Store API",
    version: "2.0.0",
    stack: "Express 5 + Mongoose + MongoDB",
    endpoints: [
      { method: "GET", path: "/api/health", description: "Database connectivity + seed counts" },
      {
        method: "GET",
        path: "/api/products",
        description: "Catalogue listing",
        query: { brand: "optional, e.g. Apple", search: "optional free text" },
      },
      {
        method: "GET",
        path: "/api/products/:idOrSlug",
        description: "One product with variants, images and per-variant EMI plans",
      },
      {
        method: "GET",
        path: "/api/products/:idOrSlug/emi-plans",
        description: "EMI plans priced against one variant",
        query: { variantId: "optional variant id or SKU; defaults to the product default" },
      },
      {
        method: "POST",
        path: "/api/emi-applications",
        description: "Submit the selected plan",
        body: { variantId: "string", emiPlanId: "string" },
      },
      {
        method: "GET",
        path: "/api/emi-applications/:reference",
        description: "Look up a submitted application",
      },
    ],
  }),
);

/** GET /api/health — proves the API can reach MongoDB, and reports what is seeded. */
app.get("/api/health", async (_req, res) => {
  const startedAt = Date.now();
  const [products, emiPlans, variants, funds, applications] = await Promise.all([
    Product.countDocuments(),
    Product.aggregate([{ $unwind: "$emiPlans" }, { $count: "n" }]),
    Product.aggregate([{ $unwind: "$variants" }, { $count: "n" }]),
    MutualFund.countDocuments(),
    EmiApplication.countDocuments(),
  ]);

  return ok(res, {
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    databaseName: mongoose.connection.name,
    latencyMs: Date.now() - startedAt,
    counts: {
      products,
      variants: variants[0]?.n ?? 0,
      emiPlans: emiPlans[0]?.n ?? 0,
      funds,
      applications,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/products", productsRouter);
app.use("/api/emi-applications", emiApplicationsRouter);

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

app.use((req, res) => fail(res, "NOT_FOUND", `No route matches ${req.method} ${req.path}.`, 404));

// Express 5 forwards rejected promises from handlers here automatically.
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
app.use((error, _req, res, _next) => {
  if (error?.name === "ApiError") {
    return fail(res, error.code, error.message, error.status);
  }
  if (error?.type === "entity.parse.failed") {
    return fail(res, "INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  console.error("[api] unhandled error:", error);
  return fail(res, "INTERNAL_ERROR", "Something went wrong while serving this request.", 500);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

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
