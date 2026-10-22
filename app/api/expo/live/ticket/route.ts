/**
 * Expo City's live room: a one-hour ticket for the signed-in student or teacher (lib/headless/live-room.ts), and
 * the room's address. The game asks only when its address says ?room=on; from Sigil itself (/expo) with the
 * session cookie, from a student's own clone at localhost with the bearer token, as /api/expo/me.
 * Until EXPO_ROOM_SECRET and EXPO_ROOM_URL are set it answers 503 room_off and signs nothing.
 */

import { NextResponse } from "next/server";
import { expoPreflight, getAuthedUserOrToken, withExpoCors } from "@/lib/headless/expo-access";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";
import { expoStore, plotOf } from "@/lib/headless/expo";
import { claimsFor, roomConfig, signTicket, TICKET_SECONDS } from "@/lib/headless/live-room";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function handlePOST(request: Request): Promise<Response> {
  const user = await getAuthedUserOrToken(request);
  const who = user?.id ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = checkRateLimit("expo-live-ticket", who);
  if (limited) {
    limited.headers.set("Cache-Control", "no-store");
    return limited;
  }
  if (!user) return NextResponse.json({ error: "Sign in to Sigil first.", code: "unauthorized" }, { status: 401, headers: NO_STORE });
  const config = roomConfig();
  if (!config) return NextResponse.json({ error: "The live room is switched off.", code: "room_off" }, { status: 503, headers: NO_STORE });
  try {
    const store = expoStore();
    const [profile, plot] = await Promise.all([
      prisma.profile.findUnique({ where: { id: user.id }, select: { displayName: true, role: true } }),
      plotOf(user.id, store),
    ]);
    // the name the post office uses: the plot's own first name, else the profile's
    const doc = plot ? await store.readPlot(plot) : null;
    const claims = claimsFor({ id: user.id, name: doc?.student ?? profile?.displayName ?? null, plot, admin: profile?.role === "admin" });
    return NextResponse.json({ ticket: signTicket(claims, config.secret), room: config.url, expiresIn: TICKET_SECONDS }, { headers: NO_STORE });
  } catch (err) {
    console.warn("[expo] live ticket failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The live room's ticket could not be made just now." }, { status: 503, headers: NO_STORE });
  }
}

// the game from a student's own clone (localhost) calls with a bearer token: lib/headless/expo-access.ts
export const POST = withExpoCors(handlePOST);
export const OPTIONS = expoPreflight;
