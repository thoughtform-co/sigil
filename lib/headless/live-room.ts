/**
 * Expo City's live room (2026-10-22): the ticket a copy of the city shows the room to join it. The room itself is
 * not Sigil's: it runs in one Cloudflare Durable Object (expo-city's tools/live/worker), and it never calls Sigil.
 * Sigil only says who the caller is, signing a one-hour ticket with a secret the two share:
 *
 *   base64url(JSON claims) "." base64url(HMAC-SHA256(EXPO_ROOM_SECRET, first part))
 *   claims = { v: 1, aud: "expo-room", sub, name, plots, role, iat, exp }
 *
 * The room trusts the ticket and nothing the client says: `name` is the one the post office already uses, `plots`
 * are the ones the student may publish there (their assigned plot's group), and `role` is "teacher" for a Sigil
 * admin, the only person the room sends other students' unmerged plots to until the teacher picks a class mode.
 *
 * Off until both EXPO_ROOM_SECRET (32 characters or more) and EXPO_ROOM_URL (wss://) are set: the route then
 * answers 503 room_off and the game, which only asks when its address says ?room=on, stays quiet.
 */

import { createHmac } from "node:crypto";

export const TICKET_SECONDS = 3600;

/**
 * Which plots a student builds, by the plot Sigil assigned them: the groups of expo-city's
 * .github/plot-owners.json (the Arcade split in two, then one quarter each). That file is the source; this copy
 * changes when a quarter is given differently there.
 */
export const PLOT_GROUPS: readonly (readonly string[])[] = [
  range(1, 5), // Arcade, first half
  range(6, 10), // Arcade, second half
  range(11, 17), // Foundry
  range(18, 23), // Highlands
  range(24, 30), // Gardens
  range(31, 36), // Farmlands
];

function range(a: number, b: number): string[] {
  return Array.from({ length: b - a + 1 }, (_, i) => `N${String(a + i).padStart(2, "0")}`);
}

/** The plots that go with an assigned plot; none without one. */
export function plotsWith(plot: string | null): string[] {
  if (!plot) return [];
  return [...(PLOT_GROUPS.find((g) => g.includes(plot)) ?? [plot])];
}

export interface RoomConfig {
  secret: string;
  url: string;
}

/** The room's configuration, or null while it is switched off. */
export function roomConfig(env: NodeJS.ProcessEnv = process.env): RoomConfig | null {
  const secret = env.EXPO_ROOM_SECRET ?? "";
  const url = env.EXPO_ROOM_URL ?? "";
  if (secret.length < 32 || !/^wss:\/\/[^\s]+$/.test(url)) return null;
  return { secret, url };
}

export interface TicketClaims {
  v: 1;
  aud: "expo-room";
  sub: string;
  name: string;
  plots: string[];
  role: "teacher" | "student";
  iat: number;
  exp: number;
}

export function claimsFor(who: { id: string; name: string | null; plot: string | null; admin: boolean }, now = Date.now()): TicketClaims {
  const name = who.name && !who.name.includes("@") ? who.name.trim().slice(0, 40) : "";
  return {
    v: 1,
    aud: "expo-room",
    sub: who.id,
    name: name || "Visitor",
    plots: plotsWith(who.plot),
    role: who.admin ? "teacher" : "student",
    iat: now,
    exp: now + TICKET_SECONDS * 1000,
  };
}

export function signTicket(claims: TicketClaims, secret: string): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
