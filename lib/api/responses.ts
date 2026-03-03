import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, status });
}

export function jsonWithTiming<T>(
  data: T,
  timings: Record<string, number>,
  status = 200,
): NextResponse {
  const response = NextResponse.json(data, { status });
  const parts = Object.entries(timings).map(([k, v]) => `${k};dur=${Math.round(v)}`);
  response.headers.set("Server-Timing", parts.join(","));
  return response;
}
