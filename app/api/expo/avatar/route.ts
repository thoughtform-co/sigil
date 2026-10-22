/**
 * Expo City's character creator (2026-10-22), from the game on Sigil's own origin, on the student's
 * own session (held to the allow-list like every route): start a draw. `{ step: "front", images,
 * note? }` draws the front view from the student's uploaded pictures (refs from
 * /api/expo/avatar/uploads); `{ step: "turn", front, views? }` draws the right, back and left views
 * (or the ones named, again) from a finished front; `{ step: "3d" }` makes the 3D model from the
 * kept views, only once Meshy is configured. Answers 202 `{ jobs: [{ view, job }] }`; each job is
 * read back at /api/expo/avatar/<job>. Every view counts against MCP_DAILY_IMAGES.
 * See lib/headless/avatar.ts.
 */

import { after, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { startAvatarDraw, studentOf } from "@/lib/headless/avatar-jobs";

export const dynamic = "force-dynamic";
// the draw runs on after the answer (`after`), and a slow model takes most of a minute
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const limited = checkRateLimit("expo-avatar", user.id);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  // JSON only: a plain cross-site form cannot send it, so the session cookie alone cannot start a draw.
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send the draw as JSON.", code: "unsupported_media_type" }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body is not JSON.", code: "invalid" }, { status: 400, headers: NO_STORE });
  }
  try {
    const outcome = await startAvatarDraw(await studentOf(user), body, { env: process.env, waitUntil: (p) => after(() => p) });
    return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] avatar draw failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The draw could not be started just now; try again.", code: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
