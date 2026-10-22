import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/auth/server", () => ({ getAuthedUser: vi.fn() }));
vi.mock("@/lib/api/rate-limit", () => ({ checkRateLimit: () => null }));
const db = vi.hoisted(() => ({ draws: new Map<string, Record<string, unknown>>(), used: 0, created: [] as Record<string, unknown>[], locks: 0, making: 0 }));
const meshy = vi.hoisted(() => ({ started: [] as string[][] }));
vi.mock("@/lib/models/meshy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/models/meshy")>();
  return {
    ...actual,
    createMeshTask: vi.fn(async (_env: unknown, urls: string[]) => {
      meshy.started.push(urls);
      return "mesh-task-1";
    }),
  };
});
vi.mock("@/lib/headless/three-d", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/headless/three-d")>()), driveThreeD: vi.fn(async () => undefined) }));
vi.mock("@/lib/headless/workspace", () => ({ ensureClaudeSession: vi.fn(async () => "session-claude") }));
vi.mock("@/lib/models/process-generation", () => ({ processGeneration: vi.fn(async () => ({ kind: "completed", outputs: [], cost: 0, modelId: "m", routed: false })) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    // the reservation: a transaction that takes the lock, counts and writes
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        $executeRaw: vi.fn(async () => {
          db.locks++;
          return 1;
        }),
        generation: {
          count: vi.fn(async () => db.making),
          findMany: vi.fn(async () => Array.from({ length: db.used }, () => ({ createdAt: new Date(), parameters: { numOutputs: 1 } }))),
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            const row = { id: `00000000-0000-4000-9000-${String(db.created.length + 1).padStart(12, "0")}`, negativePrompt: null, ...data };
            db.created.push(row);
            return row;
          }),
        },
      }),
    ),
    profile: { findUnique: vi.fn(async () => ({ displayName: "Ida Peeters", role: "user" })) },
    generation: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const d = db.draws.get(where.id);
        return d && d.userId === where.userId ? d : null;
      }),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

import { getAuthedUser } from "@/lib/auth/server";
import { avatarPrompt, cutOut } from "@/lib/headless/avatar";
import { keepAvatar, startAvatarDraw } from "@/lib/headless/avatar-jobs";
import { setExpoStore } from "@/lib/headless/expo";
import { EXPO_TOOLS } from "@/lib/headless/expo-tools";
import type { ToolContext } from "@/lib/headless/tools";
import { GET as getMe } from "@/app/api/expo/me/route";
import { POST as postDraw } from "@/app/api/expo/avatar/route";
import { GET as getJob } from "@/app/api/expo/avatar/[job]/route";
import { POST as postKeep } from "@/app/api/expo/avatar/keep/route";
import { POST as postUploads } from "@/app/api/expo/avatar/uploads/route";
import { memoryExpoStore, type MemoryExpoStore } from "./helpers/memory-expo-store";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", EXPO_PUBLIC_URL: "https://sigil.test/expo/" } as unknown as NodeJS.ProcessEnv;
const OUT = "https://x.supabase.co/storage/v1/object/public/outputs/";
const IDA = "owner-ida";
const ida = { id: IDA, isAdmin: false };
const run = { env, waitUntil: () => undefined };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tool = (name: string) => EXPO_TOOLS.find((t) => t.name === name)!;
const ctx = (ownerId: string, ownerRole = "user"): ToolContext => ({ principal: { credentialId: "c", ownerId, ownerRole }, waitUntil: () => undefined, env });

/** A finished creator draw of a view, already cut out (so nothing is fetched). */
function drew(id: string, view: string, front?: string, status = "completed", userId = IDA) {
  db.draws.set(id, {
    id,
    userId,
    status,
    errorMessage: null,
    createdAt: new Date(),
    parameters: { numOutputs: 1, expoAvatar: { view, ...(front ? { front } : {}), cutout: `${OUT}expo/avatar/${userId}/${id}.png` } },
    outputs: status === "completed" ? [{ fileUrl: `${OUT}${userId}/${id}.png`, fileType: "image" }] : [],
  });
}

let s: MemoryExpoStore;
beforeEach(async () => {
  db.draws.clear();
  db.used = 0;
  db.created = [];
  db.locks = 0;
  db.making = 0;
  meshy.started = [];
  s = memoryExpoStore({ "ida@student.test": IDA });
  setExpoStore(s);
  await tool("expo_assign").run({ plot: "N07", email: "ida@student.test", label: "Ida" }, ctx("teacher", "admin"));
});
afterEach(() => {
  setExpoStore(null);
  vi.mocked(getAuthedUser).mockReset();
});

describe("the avatar recipe's prompt", () => {
  it("holds every view to the recipe: A-pose, head to feet, plain light ground, square, no text, never a real person, no cape or loose hair", () => {
    for (const v of ["front", "right", "back", "left"] as const) {
      const p = avatarPrompt(v);
      expect(p).toMatch(/A-pose/);
      expect(p).toMatch(/head to feet/);
      expect(p).toMatch(/plain flat light grey background/);
      expect(p).toMatch(/square/);
      expect(p).toMatch(/No text/);
      expect(p).toMatch(/Never a real person/);
      expect(p).toMatch(/No cape, no long coat, no robe or gown, no hood, no wide skirt, no long loose hair/);
    }
  });
  it("draws the front from the student's pictures and words, and each side as one change from the front", () => {
    expect(avatarPrompt("front", 'the tide clerk, "Mara"')).toMatch(/reference images.*The student says of them: "the tide clerk, 'Mara'"/);
    expect(avatarPrompt("right")).toMatch(/same character as in the reference image.*One change only/);
    expect(avatarPrompt("right")).toMatch(/own right side/);
    expect(avatarPrompt("back")).toMatch(/straight from behind/);
    expect(avatarPrompt("right")).toMatch(/true side profile.*not a three-quarter view/);
    expect(avatarPrompt("left")).toMatch(/own left side/);
    // camera on their right: they face the image's right edge (and the left view the left edge)
    expect(avatarPrompt("right")).toMatch(/face the right edge/);
    expect(avatarPrompt("left")).toMatch(/face the left edge/);
  });
});

describe("cutOut", () => {
  it("takes away the light ground but keeps a light patch inside the figure", async () => {
    const W = 64;
    const px = Buffer.alloc(W * W * 3);
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        const figure = x >= 20 && x < 44 && y >= 8 && y < 60;
        const shirt = x >= 28 && x < 36 && y >= 20 && y < 30;
        const c = shirt ? 245 : figure ? 60 : 217;
        px[i] = px[i + 1] = px[i + 2] = c;
      }
    const png = await cutOut(await sharp(px, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer());
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect(info.channels).toBe(4);
    expect(a(2, 2)).toBe(0);
    expect(a(10, 40)).toBe(0);
    expect(a(24, 50)).toBe(255);
    expect(a(31, 25)).toBe(255);
  });
});

describe("the creator's routes", () => {
  it("each asks for a session", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue(null);
    const json = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
    expect((await postDraw(new Request("https://sigil.test/api/expo/avatar", json))).status).toBe(401);
    expect((await postKeep(new Request("https://sigil.test/api/expo/avatar/keep", json))).status).toBe(401);
    expect((await postUploads(new Request("https://sigil.test/api/expo/avatar/uploads", json))).status).toBe(401);
    expect((await getJob(new Request("https://sigil.test/api/expo/avatar/x"), { params: Promise.resolve({ job: uuid(1) }) })).status).toBe(401);
  });
  it("takes JSON only, and refuses a body that is not a draw", async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: IDA, email: "ida@student.test" });
    expect((await postDraw(new Request("https://sigil.test/api/expo/avatar", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }))).status).toBe(415);
    const res = await postDraw(new Request("https://sigil.test/api/expo/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "front", images: [] }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid");
  });
  it("finds only the student's own creator draws", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.mocked(getAuthedUser).mockResolvedValue({ id: IDA, email: "ida@student.test" });
    drew(uuid(9), "front", undefined, "completed", "owner-bo");
    const res = await getJob(new Request("https://sigil.test/api/expo/avatar/x"), { params: Promise.resolve({ job: uuid(9) }) });
    expect(res.status).toBe(404);
    drew(uuid(1), "front");
    const mine = await (await getJob(new Request("https://sigil.test/api/expo/avatar/x"), { params: Promise.resolve({ job: uuid(1) }) })).json();
    expect(mine).toMatchObject({ job: uuid(1), view: "front", status: "completed", url: `${OUT}expo/avatar/${IDA}/${uuid(1)}.png`, transparent: true });
    vi.unstubAllEnvs();
  });
});

describe("startAvatarDraw", () => {
  it("draws the sides only from a finished front of the student's own", async () => {
    expect((await startAvatarDraw(ida, { step: "turn", front: uuid(1) }, run, s)).status).toBe(404);
    drew(uuid(1), "front", undefined, "processing");
    expect((await startAvatarDraw(ida, { step: "turn", front: uuid(1) }, run, s)).status).toBe(409);
  });
  it("reserves the allowance under the student's lock before anything is drawn, and writes nothing when it is spent", async () => {
    vi.stubEnv("MCP_DAILY_IMAGES", "60");
    drew(uuid(1), "front");
    const turned = await startAvatarDraw(ida, { step: "turn", front: uuid(1) }, run, s);
    expect(turned.status).toBe(202);
    expect(db.locks).toBe(1);
    expect(db.created.map((r) => (r.parameters as { expoAvatar: { view: string; front: string } }).expoAvatar)).toEqual([
      { view: "right", front: uuid(1) },
      { view: "back", front: uuid(1) },
      { view: "left", front: uuid(1) },
    ]);
    expect(db.created.every((r) => r.source === "mcp" && r.status === "processing" && (r.parameters as { aspectRatio?: string }).aspectRatio === "1:1")).toBe(true);
    // 58 used: the three sides do not fit, and no row is written
    db.used = 58;
    db.created = [];
    const spent = await startAvatarDraw(ida, { step: "turn", front: uuid(1) }, run, s);
    expect(spent.status).toBe(429);
    expect(spent.body).toMatchObject({ code: "allowance" });
    expect(db.created).toEqual([]);
    vi.unstubAllEnvs();
  });
  it("hands on only Sigil's own outputs", async () => {
    const { isOutput } = await import("@/lib/headless/avatar-jobs");
    expect(isOutput(`${OUT}a/b.png`, env)).toBe(true);
    expect(isOutput(`${OUT}a/../../private/x.png`, env)).toBe(false);
    expect(isOutput(`${OUT}a/%2e%2e/x.png`, env)).toBe(false);
    expect(isOutput("https://elsewhere.test/storage/v1/object/public/outputs/a.png", env)).toBe(false);
    expect(isOutput(`${OUT}a.png?redirect=1`, env)).toBe(false);
  });
  it("makes the 3D model from the four kept originals, front first, after its row is reserved, and only one at a time", async () => {
    const env3d = { ...env, MESHY_API_KEY: "k" } as NodeJS.ProcessEnv;
    const views = Object.fromEntries(["front", "right", "back", "left"].map((v) => [v, `${OUT}${IDA}/${v}.png`]));
    await s.writeAvatar(IDA, { avatar: { kind: "views", ...views } as never, sources: views as never, keptAt: "2026-10-22T10:00:00.000Z" });
    const started = await startAvatarDraw(ida, { step: "3d" }, { env: env3d, waitUntil: () => undefined }, s);
    expect(started.status).toBe(202);
    expect(meshy.started).toEqual([[views.front, views.right, views.back, views.left]]);
    expect(db.created).toHaveLength(1);
    expect((db.created[0]!.parameters as { expoAvatar: { view: string } }).expoAvatar.view).toBe("glb");
    // a second press while it is being made: refused before Meshy is asked
    db.making = 1;
    const again = await startAvatarDraw(ida, { step: "3d" }, { env: env3d, waitUntil: () => undefined }, s);
    expect(again.body).toMatchObject({ code: "busy" });
    expect(meshy.started).toHaveLength(1);
  });
  it("keeps a finished 3D model as the contract's glb, with the four views beside it", async () => {
    const views = Object.fromEntries(["front", "right", "back", "left"].map((v) => [v, `${OUT}expo/avatar/${IDA}/${v}.png`]));
    await s.writeAvatar(IDA, { avatar: { kind: "views", ...views } as never, keptAt: "2026-10-22T10:00:00.000Z" });
    db.draws.set(uuid(7), { id: uuid(7), userId: IDA, status: "completed", errorMessage: null, createdAt: new Date(), outputs: [], parameters: { expoAvatar: { view: "glb" }, threeD: { meshTaskId: "mesh-task-1", stage: "done", glbUrl: `${OUT}${IDA}/${uuid(7)}/avatar.glb` } } });
    const r = await keepAvatar(ida, { glb: uuid(7) }, env, s);
    expect(r.status).toBe(200);
    expect(s.avatars.get(IDA)?.avatar).toEqual({ kind: "glb", src: `${OUT}${IDA}/${uuid(7)}/avatar.glb`, views });
  });
  it("offers no 3D model while Meshy is not configured", async () => {
    const r = await startAvatarDraw(ida, { step: "3d" }, run, s);
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ code: "no_3d" });
  });
});

describe("keepAvatar and me", () => {
  const me = async () => {
    vi.mocked(getAuthedUser).mockResolvedValue({ id: IDA, email: "ida@student.test" });
    return (await getMe(new Request("https://sigil.test/api/expo/me"))).json();
  };

  it("me starts with no avatar, Module 2 as the assignment, and no 3D", async () => {
    const m = await me();
    expect(m.avatar).toBeNull();
    expect(m.threeD).toBe(false);
    expect(m.assignment).toMatchObject({ module: 2, title: "Worldbuilding", line: "Your world on one page." });
    expect(m.assignment.steps.length).toBeGreaterThan(3);
    expect(m.assignment.done.length).toBeGreaterThan(1);
  });

  it("keeps four views of one character, and me gives them as the contract's views", async () => {
    drew(uuid(1), "front");
    drew(uuid(2), "right", uuid(1));
    drew(uuid(3), "back", uuid(1));
    drew(uuid(4), "left", uuid(1));
    const r = await keepAvatar(ida, { front: uuid(1), right: uuid(2), back: uuid(3), left: uuid(4) }, env, s);
    expect(r.status).toBe(200);
    const m = await me();
    expect(m.avatar).toEqual({ kind: "views", front: `${OUT}expo/avatar/${IDA}/${uuid(1)}.png`, right: `${OUT}expo/avatar/${IDA}/${uuid(2)}.png`, back: `${OUT}expo/avatar/${IDA}/${uuid(3)}.png`, left: `${OUT}expo/avatar/${IDA}/${uuid(4)}.png` });
    // the originals stay private, for the 3D model
    expect(s.avatars.get(IDA)?.sources?.front).toBe(`${OUT}${IDA}/${uuid(1)}.png`);
  });

  it("refuses views drawn from another front, a view not drawn yet, and a view in the wrong place", async () => {
    drew(uuid(1), "front");
    drew(uuid(5), "front");
    drew(uuid(2), "right", uuid(1));
    drew(uuid(3), "back", uuid(5));
    drew(uuid(4), "left", uuid(1), "processing");
    expect((await keepAvatar(ida, { front: uuid(1), right: uuid(2), back: uuid(3), left: uuid(4) }, env, s)).body).toMatchObject({ code: "not_one" });
    drew(uuid(3), "back", uuid(1));
    expect((await keepAvatar(ida, { front: uuid(1), right: uuid(2), back: uuid(3), left: uuid(4) }, env, s)).body).toMatchObject({ code: "not_ready" });
    expect((await keepAvatar(ida, { front: uuid(1), right: uuid(3), back: uuid(2), left: uuid(4) }, env, s)).body).toMatchObject({ code: "no_job" });
    expect(s.avatars.get(IDA)).toBeUndefined();
  });

  it("hands out no assignment once Module 2 is posted", async () => {
    await tool("expo_post").run({ module: 2, url: "https://claude.ai/artifact/AbCdEf123456" }, ctx(IDA));
    expect((await me()).assignment).toBeNull();
  });
});
