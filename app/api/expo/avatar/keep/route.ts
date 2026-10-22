/**
 * Keep a character from Expo City's creator as the student's avatar, on their own session:
 * `{ front, right, back, left }`, the four finished draws (the side views drawn from that front),
 * or `{ glb }`, a finished 3D model made from them. The game reads it from /api/expo/me as
 * `avatar`. See lib/headless/avatar.ts.
 */

import { NextResponse } from "next/server";
import { expoPreflight, getAuthedUserOrToken, withExpoCors } from "@/lib/headless/expo-access";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { keepAvatar, studentOf } from "@/lib/headless/avatar-jobs";

export const dynamic = "force-dynamic";
// a view not yet cut out of its ground is cut here (four at most); the same limit as the creator's other routes,
// so the function is built like them (a lone 60 left it without sharp's native files in production)
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

async function handlePOST(request: Request): Promise<Response> {
  const user = await getAuthedUserOrToken(request);
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const limited = checkRateLimit("expo-avatar", user.id);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send it as JSON.", code: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body is not JSON.", code: "invalid" }, { status: 400, headers: NO_STORE });
  }
  try {
    const outcome = await keepAvatar(await studentOf(user), body, process.env);
    return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] avatar keep failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The character could not be kept just now; try again.", code: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}

// the game from a student's own clone (localhost) calls with a bearer token: lib/headless/expo-access.ts
export const POST = withExpoCors(handlePOST);
export const OPTIONS = expoPreflight;
