import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, status });
}
