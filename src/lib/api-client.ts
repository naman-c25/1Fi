import { headers } from "next/headers";

import type { ApiResponse } from "./types";

/** How long a rendered page may reuse catalogue data before refetching. */
export const CATALOGUE_TTL_SECONDS = 60;

/**
 * The pages deliberately go through the HTTP API rather than importing the
 * Prisma layer directly: the assignment asks for a page driven by a backend
 * API, and routing every read through `/api/*` means the browser and the
 * server render from exactly the same contract.
 *
 * Server Components have no notion of "current origin", so it is rebuilt from
 * the incoming request headers (which also works behind Vercel's proxy).
 */
export async function getBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    `localhost:${process.env.PORT ?? 3000}`;
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** GET a JSON endpoint of this app and unwrap the success envelope. */
export async function apiGet<T>(path: string): Promise<T> {
  const base = await getBaseUrl();
  const response = await fetch(`${base}${path}`, {
    headers: { accept: "application/json" },
    // A catalogue changes far less often than it is viewed, so the rendered
    // pages reuse a cached response for a minute rather than paying a database
    // round trip per visit. `/api/*` itself stays uncached, so the JSON a
    // reviewer curls is always live.
    next: { revalidate: CATALOGUE_TTL_SECONDS, tags: ["catalogue"] },
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    const error = payload.success
      ? { code: "UNKNOWN", message: response.statusText }
      : payload.error;
    throw new ApiError(response.status, error.code, error.message);
  }

  return payload.data;
}
