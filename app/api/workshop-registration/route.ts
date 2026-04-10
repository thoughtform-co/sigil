/**
 * POST /api/workshop-registration — public registration endpoint.
 * Intentionally public: no session required. Rate-limited by IP.
 * Allowlisted in tests/contracts/api-route-auth-coverage.test.ts.
 */

import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  submitRegistration,
  workshopRegistrationSubmitSchema,
  RegistrationError,
} from "@/lib/workshop-registration";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimited = checkRateLimit("workshop-registration", ip);
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = workshopRegistrationSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await submitRegistration(slug, parsed.data, ip);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof RegistrationError) {
      const statusMap: Record<string, number> = {
        event_not_found: 404,
        event_full: 409,
        already_registered: 409,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    console.error("[workshop-registration] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
