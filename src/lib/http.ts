import { NextResponse } from "next/server";

import type { ApiResponse } from "./types";

/**
 * Every endpoint answers with the same envelope so clients only ever branch on
 * `success`. Keeping this in one place also keeps status codes honest.
 */

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true as const, data, ...(meta ? { meta } : {}) }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status });
}

/** Anything that escapes a handler becomes a 500 without leaking internals. */
export function serverError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error("[api] unhandled error:", error);
  return fail("INTERNAL_ERROR", "Something went wrong while serving this request.", 500);
}
