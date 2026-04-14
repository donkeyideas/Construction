import { NextResponse } from "next/server";

/**
 * Standardized API response helpers.
 *
 * Success responses: { data: T }
 * Error responses:   { error: string }
 *
 * Existing routes already use NextResponse.json() directly — these helpers
 * are for new routes and gradual migration.
 */

// ---------------------------------------------------------------------------
// Success
// ---------------------------------------------------------------------------

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function apiNotFound(message = "Not found") {
  return apiError(message, 404);
}

export function apiBadRequest(message = "Bad request") {
  return apiError(message, 400);
}

// ---------------------------------------------------------------------------
// Safe JSON body parser — returns parsed body or a 400 NextResponse
// ---------------------------------------------------------------------------

export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return apiBadRequest("Invalid JSON in request body");
  }
}

/**
 * Type guard: returns true when parseJsonBody returned an error response
 * instead of the parsed body.
 */
export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
