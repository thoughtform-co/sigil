import { NextResponse, type NextRequest } from "next/server";

const HEADER = "X-Request-Id";

export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

export function withCorrelationId(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const id = request.headers.get(HEADER) ?? generateRequestId();
  response.headers.set(HEADER, id);
  return response;
}
