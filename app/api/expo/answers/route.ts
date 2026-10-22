/**
 * The student's answers to the keeper's three questions about a parcel, from the post office in
 * Expo City (same origin, so no CORS), on the student's own Sigil session. Kept once, in the
 * private hand-in for the teacher's mailroom; a second time is 409 until the hand-in is posted
 * again. See lib/headless/post-office.ts.
 */

import { NextResponse } from "next/server";
import { expoPreflight, getAuthedUserOrToken, withExpoCors } from "@/lib/headless/expo-access";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { answerParcel } from "@/lib/headless/post-office";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function handlePOST(request: Request): Promise<Response> {
  const user = await getAuthedUserOrToken(request);
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const limited = checkRateLimit("expo-answers", user.id);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  // JSON only: a plain cross-site form cannot send it, so the session cookie alone cannot post answers.
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send the answers as JSON.", code: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body is not JSON.", code: "invalid" }, { status: 400, headers: NO_STORE });
  }
  try {
    const outcome = await answerParcel(user.id, body);
    return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] answers failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The answers could not be kept just now; try again.", code: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}

// the game from a student's own clone (localhost) calls with a bearer token: lib/headless/expo-access.ts
export const POST = withExpoCors(handlePOST);
export const OPTIONS = expoPreflight;
