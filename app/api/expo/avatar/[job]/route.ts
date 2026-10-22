/**
 * One draw of Expo City's character creator, read back on the student's own session: processing,
 * failed (and why), or completed with the view's URL, cut out of its ground as a transparent PNG
 * (a 3D model's URL is its GLB). Only the student's own creator draws are found.
 * See lib/headless/avatar.ts.
 */

import { NextResponse } from "next/server";
import { expoPreflight, getAuthedUserOrToken, withExpoCors } from "@/lib/headless/expo-access";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { avatarJob, studentOf } from "@/lib/headless/avatar-jobs";

export const dynamic = "force-dynamic";
// a finished 3D model's last step (the file's finish) runs on its first read
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

async function handleGET(request: Request, { params }: { params: Promise<{ job: string }> }): Promise<Response> {
  const user = await getAuthedUserOrToken(request);
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const limited = checkRateLimit("expo-avatar-job", user.id);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  const { job } = await params;
  try {
    const outcome = await avatarJob(await studentOf(user), job, process.env);
    return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] avatar job failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The draw could not be read just now; try again.", code: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}

// the game from a student's own clone (localhost) calls with a bearer token: lib/headless/expo-access.ts
export const GET = withExpoCors(handleGET);
export const OPTIONS = expoPreflight;
