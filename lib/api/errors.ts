import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "conflict"
  | "internal_error";

export interface ApiErrorPayload {
  error: string;
  code?: ApiErrorCode;
  details?: unknown;
}

function apiError(payload: ApiErrorPayload, status: number): NextResponse {
  return NextResponse.json(
    { error: payload.error, code: payload.code ?? inferCode(status), ...(payload.details != null && { details: payload.details }) },
    { status }
  );
}

function inferCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400) return "bad_request";
  if (status === 409) return "conflict";
  return "internal_error";
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return apiError({ error: message, code: "unauthorized" }, 401);
}

export function forbidden(message = "Forbidden"): NextResponse {
  return apiError({ error: message, code: "forbidden" }, 403);
}

export function notFound(message = "Not found"): NextResponse {
  return apiError({ error: message, code: "not_found" }, 404);
}

export function badRequest(error: string, details?: unknown): NextResponse {
  return apiError({ error, code: "bad_request", details }, 400);
}

export function conflict(message: string): NextResponse {
  return apiError({ error: message, code: "conflict" }, 409);
}

export function internalError(message = "Internal server error", details?: unknown): NextResponse {
  return apiError({ error: message, code: "internal_error", details }, 500);
}
