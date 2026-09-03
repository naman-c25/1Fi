/**
 * Vercel serverless entry point.
 *
 * Vercel invokes exported handlers; it never runs `app.listen()`. An Express
 * app *is* a `(req, res)` handler, so exporting it is nearly all that is
 * required — `vercel.json` rewrites every path here and Express routes itself.
 *
 * The database connection is opened lazily per request (and cached across warm
 * invocations) in `src/db.js`, because a function has no "boot" step.
 *
 * The import is wrapped because anything thrown while the module graph is
 * evaluated — a missing dependency, a bad import path — kills the function
 * before Express exists, and Vercel can only report a bare
 * FUNCTION_INVOCATION_FAILED with no clue as to why. Catching it lets the
 * deployment explain itself over HTTP instead of only in the runtime logs.
 */

let app = null;
let startupError = null;

try {
  ({ app } = await import("../src/app.js"));
} catch (error) {
  startupError = error;
  console.error("[api] failed to initialise:", error);
}

export default function handler(req, res) {
  if (startupError) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code: "STARTUP_FAILED",
          message: `The API could not start: ${startupError.message}`,
          hint:
            "Usually a dependency that was not installed for this deployment. " +
            "Check that the Vercel project's Root Directory is `server`, then " +
            "read the runtime logs for the full stack trace.",
        },
      }),
    );
    return;
  }

  return app(req, res);
}
