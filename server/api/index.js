/**
 * Vercel serverless entry point.
 *
 * Vercel invokes exported handlers; it never runs `app.listen()`. An Express
 * app *is* a `(req, res)` handler, so exporting it is all that is required —
 * `vercel.json` rewrites every path here and Express does its own routing.
 *
 * The database connection is opened lazily per request (and cached across
 * warm invocations) in `src/db.js`, because a function has no "boot" step.
 */

import { app } from "../src/app.js";

export default app;
