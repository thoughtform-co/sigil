import { NextResponse } from "next/server";

type CacheProfile = "stable" | "short" | "private-short" | "none";

const PROFILES: Record<CacheProfile, string> = {
  stable: "public, s-maxage=300, stale-while-revalidate=60",
  short: "public, s-maxage=10, stale-while-revalidate=5",
  "private-short": "private, max-age=10",
  none: "no-store",
};

export function withCacheHeaders(response: NextResponse, profile: CacheProfile): NextResponse {
  response.headers.set("Cache-Control", PROFILES[profile]);
  return response;
}
