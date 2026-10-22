import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getAuthedUser: vi.fn() }));
vi.mock("@/lib/api/rate-limit", () => ({ checkRateLimit: () => null }));
const profiles = vi.hoisted(() => new Map<string, { displayName: string | null; role: string }>());
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => profiles.get(where.id) ?? null) } },
}));

import { getAuthedUser } from "@/lib/auth/server";
import { setExpoStore, type ExpoStore } from "@/lib/headless/expo";
import { PLOT_GROUPS, claimsFor, plotsWith, roomConfig, signTicket } from "@/lib/headless/live-room";
import { POST, OPTIONS } from "@/app/api/expo/live/ticket/route";

const SECRET = "s".repeat(40);
const ROOM = "wss://expo-city-room.example.workers.dev/room";

/** What the room worker does with a ticket (expo-city tools/live/worker/src/index.js), in Node. */
function roomReads(ticket: string, secret = SECRET) {
  const [body, sig] = ticket.split(".");
  const want = createHmac("sha256", secret).update(body!).digest("base64url");
  if (sig !== want) return null;
  return JSON.parse(Buffer.from(body!, "base64url").toString("utf8"));
}

const call = (headers: Record<string, string> = {}) => POST(new Request("https://sigil.test/api/expo/live/ticket", { method: "POST", headers }));

beforeEach(() => {
  profiles.clear();
  setExpoStore({
    readAssignments: async () => ({ N02: { ownerId: "ada" }, N24: { ownerId: "sep" } }),
    readPlot: async (plot: string) => (plot === "N02" ? { student: "Ada" } : null),
  } as unknown as ExpoStore);
});
afterEach(() => {
  vi.unstubAllEnvs();
  setExpoStore(null);
});

describe("the live room's ticket", () => {
  it("groups the plots as expo-city's plot-owners.json does: 36 plots, each in one group", () => {
    const all = PLOT_GROUPS.flat();
    expect(all).toHaveLength(36);
    expect(new Set(all).size).toBe(36);
    expect(plotsWith("N02")).toEqual(["N01", "N02", "N03", "N04", "N05"]);
    expect(plotsWith("N06")).toEqual(["N06", "N07", "N08", "N09", "N10"]);
    expect(plotsWith("N31")).toEqual(["N31", "N32", "N33", "N34", "N35", "N36"]);
    expect(plotsWith(null)).toEqual([]);
  });

  it("is switched off without a long secret and a wss:// room", () => {
    expect(roomConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(roomConfig({ EXPO_ROOM_SECRET: "short", EXPO_ROOM_URL: ROOM } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(roomConfig({ EXPO_ROOM_SECRET: SECRET, EXPO_ROOM_URL: "ws://insecure.example/room" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(roomConfig({ EXPO_ROOM_SECRET: SECRET, EXPO_ROOM_URL: ROOM } as unknown as NodeJS.ProcessEnv)).toEqual({ secret: SECRET, url: ROOM });
  });

  it("is signed so the room can check it, and an address is never a name", () => {
    const claims = claimsFor({ id: "u1", name: "someone@school.be", plot: "N24", admin: false }, 1000);
    expect(claims).toMatchObject({ v: 1, aud: "expo-room", sub: "u1", name: "Visitor", role: "student", iat: 1000, exp: 1000 + 3600_000 });
    expect(roomReads(signTicket(claims, SECRET))).toEqual(claims);
    expect(roomReads(signTicket(claims, SECRET), "x".repeat(40))).toBeNull();
  });
});

describe("POST /api/expo/live/ticket", () => {
  it("refuses someone signed out", async () => {
    vi.stubEnv("EXPO_ROOM_SECRET", SECRET);
    vi.stubEnv("EXPO_ROOM_URL", ROOM);
    vi.mocked(getAuthedUser).mockResolvedValueOnce(null);
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("answers 503 room_off and signs nothing while the room is not configured", async () => {
    vi.mocked(getAuthedUser).mockResolvedValueOnce({ id: "ada", email: "ada@student.test" });
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "room_off" });
  });

  it("gives a student their name, their plots and the student role", async () => {
    vi.stubEnv("EXPO_ROOM_SECRET", SECRET);
    vi.stubEnv("EXPO_ROOM_URL", ROOM);
    profiles.set("ada", { displayName: "Ada Lovelace", role: "user" });
    vi.mocked(getAuthedUser).mockResolvedValueOnce({ id: "ada", email: "ada@student.test" });
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { ticket: string; room: string; expiresIn: number };
    expect(body.room).toBe(ROOM);
    expect(body.expiresIn).toBe(3600);
    expect(roomReads(body.ticket)).toMatchObject({ sub: "ada", name: "Ada", plots: ["N01", "N02", "N03", "N04", "N05"], role: "student" });
  });

  it("marks a Sigil admin as the teacher, with no plots of their own", async () => {
    vi.stubEnv("EXPO_ROOM_SECRET", SECRET);
    vi.stubEnv("EXPO_ROOM_URL", ROOM);
    profiles.set("vince", { displayName: "Vince", role: "admin" });
    vi.mocked(getAuthedUser).mockResolvedValueOnce({ id: "vince", email: "teacher@school.test" });
    const body = (await (await call()).json()) as { ticket: string };
    expect(roomReads(body.ticket)).toMatchObject({ sub: "vince", name: "Vince", plots: [], role: "teacher" });
  });

  it("answers a student's own clone at localhost with CORS, and nowhere else", async () => {
    const pre = OPTIONS(new Request("https://sigil.test/api/expo/live/ticket", { method: "OPTIONS", headers: { origin: "http://localhost:5173" } }));
    expect(pre.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    const far = OPTIONS(new Request("https://sigil.test/api/expo/live/ticket", { method: "OPTIONS", headers: { origin: "https://evil.test" } }));
    expect(far.headers.get("access-control-allow-origin")).toBeNull();
  });
});
