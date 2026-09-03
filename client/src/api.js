/**
 * The only place the client talks to the backend.
 *
 * By default every call is same-origin: Vite proxies `/api` to Express on port
 * 4000 in development, and `client/vercel.json` rewrites `/api/*` to the
 * deployed API in production. The browser therefore never makes a
 * cross-origin request, so there is no CORS to get wrong.
 *
 * Set `VITE_API_URL` to call an API on another origin instead — the backend
 * allows it, but then `CORS_ORIGIN` on the server has to name this client.
 */

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Unwraps the `{ success, data }` envelope every endpoint uses, so callers get
 * the payload directly and failures arrive as thrown ApiErrors.
 *
 * @param {string} path e.g. "/api/products"
 * @param {RequestInit} [options]
 */
export async function apiFetch(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { accept: "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Is the API running?");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, "BAD_RESPONSE", "The server sent a malformed response.");
  }

  if (!response.ok || !payload.success) {
    const error = payload.error ?? { code: "UNKNOWN", message: response.statusText };
    throw new ApiError(response.status, error.code, error.message);
  }

  return payload.data;
}

export const getProducts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.brand) query.set("brand", params.brand);
  if (params.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query}` : "";
  return apiFetch(`/api/products${suffix}`);
};

export const getProduct = (slug) => apiFetch(`/api/products/${encodeURIComponent(slug)}`);

export const getEmiPlans = (slug, variantId) =>
  apiFetch(
    `/api/products/${encodeURIComponent(slug)}/emi-plans` +
      (variantId ? `?variantId=${encodeURIComponent(variantId)}` : ""),
  );

export const createEmiApplication = (variantId, emiPlanId) =>
  apiFetch("/api/emi-applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ variantId, emiPlanId }),
  });
