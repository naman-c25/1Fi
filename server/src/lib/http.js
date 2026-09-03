/**
 * Every endpoint answers with the same envelope, so the client only ever
 * branches on `success`.
 */

export function ok(res, data, meta, status = 200) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function fail(res, code, message, status = 400) {
  return res.status(status).json({ success: false, error: { code, message } });
}

/** Thrown by route handlers to produce a specific status + code. */
export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
