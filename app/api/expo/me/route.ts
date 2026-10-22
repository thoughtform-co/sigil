/**
 * The keeper's view of the signed-in student, for the post office in Expo City (same origin, so
 * no CORS): their name, their plot and each posted parcel's card and questions, newest module
 * first; their kept character and the pigeon's first task (the first run, 2026-10-22). Signed
 * out, where to sign in. Never the record's text, never another student's parcels.
 * See lib/headless/post-office.ts.
 */

import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";
import { SIGN_IN_URL, meOf } from "@/lib/headless/post-office";
import { hasMeshyKey } from "@/lib/models/meshy";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const user = await getAuthedUser();
  const who = user?.id ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = checkRateLimit("expo-me", who);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  if (!user) return NextResponse.json({ signedIn: false, signIn: SIGN_IN_URL }, { headers: NO_STORE });
  try {
    const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { displayName: true } });
    return NextResponse.json(await meOf(user.id, profile?.displayName ?? null, undefined, { threeD: hasMeshyKey(process.env) }), { headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] me failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The post office could not be read just now." }, { status: 503, headers: NO_STORE });
  }
}
