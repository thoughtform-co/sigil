import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server", () => ({ getAuthedUser: vi.fn() }));
// The routes' limiter is the real one only where a test asks for it, so the other tests can post freely.
const limiter = vi.hoisted(() => ({ real: false }));
vi.mock("@/lib/api/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/rate-limit")>();
  return { checkRateLimit: (route: string, id: string) => (limiter.real ? actual.checkRateLimit(route, id) : null) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { findUnique: vi.fn(async () => ({ displayName: "Ida Peeters" })) } } }));

import { getAuthedUser } from "@/lib/auth/server";
import { promptOf, promptsSince, setExpoStore, setPromptsQuery, type PromptsQuery } from "@/lib/headless/expo";
import { EXPO_TOOLS } from "@/lib/headless/expo-tools";
import type { HandIn } from "@/lib/headless/hand-in";
import { SIGN_IN_URL } from "@/lib/headless/post-office";
import type { ToolContext } from "@/lib/headless/tools";
import { GET as getMe } from "@/app/api/expo/me/route";
import { POST as postAnswers } from "@/app/api/expo/answers/route";
import { memoryExpoStore, type MemoryExpoStore } from "./helpers/memory-expo-store";
import sample from "./fixtures/hand-in-sample.json";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", EXPO_PUBLIC_URL: "https://sigil.test/expo/" } as unknown as NodeJS.ProcessEnv;
const tool = (name: string) => EXPO_TOOLS.find((t) => t.name === name)!;
const ctx = (ownerId: string, ownerRole = "user"): ToolContext => ({ principal: { credentialId: "c", ownerId, ownerRole }, waitUntil: () => undefined, env });
const textOf = (r: { content: { type: string; text?: string }[] }) => r.content.map((c) => c.text ?? "").join("\n");
const record = sample as unknown as HandIn;
const URL1 = "https://claude.ai/artifact/AbCdEf123456";
const signedIn = (id: string | null) => vi.mocked(getAuthedUser).mockResolvedValue(id ? { id, email: `${id}@student.test` } : null);
const me = async () => {
  const res = await getMe(new Request("https://sigil.test/api/expo/me"));
  return { res, body: await res.json() };
};
const answer = (body: unknown, type = "application/json") =>
  postAnswers(new Request("https://sigil.test/api/expo/answers", { method: "POST", headers: { "Content-Type": type }, body: JSON.stringify(body) }));

let s: MemoryExpoStore;
let asked: { ownerId: string; since: Date; limit: number }[];
const drawn: PromptsQuery = async (ownerId, since, limit) => {
  asked.push({ ownerId, since, limit });
  return [{ model: "gemini-3-pro-image", prompt: "a tide clerk at a brass drawer", refs: 2, at: "2026-10-19T10:00:00.000Z" }];
};

beforeEach(async () => {
  s = memoryExpoStore({ "ida@student.test": "owner-ida", "bo@student.test": "owner-bo" });
  setExpoStore(s);
  asked = [];
  setPromptsQuery(drawn);
  await tool("expo_assign").run({ plot: "N07", email: "ida@student.test", label: "Ida" }, ctx("teacher", "admin"));
  await tool("expo_assign").run({ plot: "N09", email: "bo@student.test", label: "Bo" }, ctx("teacher", "admin"));
});
afterEach(() => {
  setExpoStore(null);
  setPromptsQuery(null);
  vi.mocked(getAuthedUser).mockReset();
});

describe("expo_post with the hand-in's record", () => {
  it("keeps the record privately, with Sigil's prompts and the keeper's questions, whatever the caller sent", async () => {
    const r = await tool("expo_post").run({ module: 4, url: URL1, record }, ctx("owner-ida"));
    expect(r.isError).toBeUndefined();
    expect(textOf(r)).toMatch(/three questions/);
    expect(textOf(r)).toContain("https://sigil.test/expo/?place=post");
    const kept = s.handIns.get("N07/4")!;
    expect(kept.url).toBe(URL1);
    expect(kept.record?.prompts).toEqual([{ model: "gemini-3-pro-image", prompt: "a tide clerk at a brass drawer", refs: 2, at: "2026-10-19T10:00:00.000Z" }]);
    expect(kept.record?.answers).toEqual([]);
    expect(kept.record?.title).toBe("Tide clerks");
    expect(kept.questions.map((q) => q.id)).toEqual(["reject", "reference", "business"]);
    expect(kept.answers).toEqual([]);
    // the questions stay with the student: Claude is not told them
    expect(textOf(r)).not.toContain("What was wrong with it");
    expect(JSON.stringify(r.structuredContent)).not.toContain("What was wrong with it");
    // the public document learns nothing new
    expect(JSON.stringify(s.files.get("N07"))).not.toContain("Tide clerks");
    // a first post looks 21 days back for the student's own draws
    expect(asked[0]?.ownerId).toBe("owner-ida");
    expect(asked[0]?.limit).toBe(300);
    expect(Date.now() - asked[0]!.since.getTime()).toBeGreaterThan(20.9 * 86_400_000);
  });

  it("refuses a record that is invalid, for another module, or for another plot, and saves nothing", async () => {
    await expect(tool("expo_post").run({ module: 4, url: URL1, record: { ...record, extra: 1 } }, ctx("owner-ida"))).rejects.toThrow(/record was refused/);
    await expect(tool("expo_post").run({ module: 3, url: URL1, record }, ctx("owner-ida"))).rejects.toThrow(/module 4, not module 3/);
    await expect(tool("expo_post").run({ module: 4, url: URL1, record: { ...record, plot: "N09" } }, ctx("owner-ida"))).rejects.toThrow(/names plot N09/);
    expect(s.handIns.size).toBe(0);
    expect(s.posts.get("N07")).toBeUndefined();
    // an empty plot is fine
    expect((await tool("expo_post").run({ module: 4, url: URL1, record: { ...record, plot: "" } }, ctx("owner-ida"))).isError).toBeUndefined();
  });

  it("without a record works as before and keeps no hand-in", async () => {
    await tool("expo_post").run({ module: 2, url: URL1 }, ctx("owner-ida"));
    expect(s.posts.get("N07")?.["2"]?.url).toBe(URL1);
    expect(s.handIns.size).toBe(0);
    expect(asked).toHaveLength(0);
  });

  it("takes a teacher's post for a plot with the plot's student's prompts", async () => {
    await tool("expo_post").run({ module: 4, url: URL1, record, plot: "N07" }, ctx("teacher", "admin"));
    expect(asked[0]?.ownerId).toBe("owner-ida");
  });

  it("starts the prompts at the previous post, and a repost of the same module keeps the week", () => {
    const now = new Date("2026-10-20T12:00:00.000Z");
    const post = { "2": { url: URL1, at: "2026-10-06T09:00:00.000Z" }, "3": { url: URL1, at: "2026-10-13T09:00:00.000Z" } };
    expect(promptsSince(post, 4, now).toISOString()).toBe("2026-10-13T09:00:00.000Z");
    expect(promptsSince(post, 3, now).toISOString()).toBe("2026-10-06T09:00:00.000Z");
    expect(promptsSince({}, 1, now).toISOString()).toBe("2026-09-29T12:00:00.000Z");
  });

  it("reads a draw's reference count when its parameters carry one", () => {
    const at = new Date("2026-10-19T10:00:00.000Z");
    expect(promptOf({ modelId: "m", prompt: "p", parameters: { referenceImages: ["a", "b", "c"] }, createdAt: at })).toEqual({ model: "m", prompt: "p", refs: 3, at: at.toISOString() });
    expect(promptOf({ modelId: "m", prompt: "p", parameters: { referenceImageUrl: "https://x" }, createdAt: at }).refs).toBe(1);
    expect(promptOf({ modelId: "m", prompt: "p", parameters: { numOutputs: 1 }, createdAt: at })).not.toHaveProperty("refs");
    expect(promptOf({ modelId: "m", prompt: "q".repeat(9000), parameters: null, createdAt: at }).prompt).toHaveLength(8000);
  });
});

describe("GET /api/expo/me", () => {
  it("signed out: where to sign in, coming back to the post office", async () => {
    signedIn(null);
    const { res, body } = await me();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(body).toEqual({ signedIn: false, signIn: SIGN_IN_URL });
    expect(SIGN_IN_URL).toBe("/login?next=%2Fexpo%2F%3Fplace%3Dpost");
  });

  it("no plot yet: plot null, no parcels", async () => {
    signedIn("owner-nobody");
    expect((await me()).body).toEqual({ signedIn: true, name: "Ida Peeters", plot: null, parcels: [], avatar: null, assignment: expect.objectContaining({ module: 2 }), threeD: false });
  });

  it("lists the student's own parcels newest module first, the card and questions only", async () => {
    await tool("expo_post").run({ module: 2, url: URL1 }, ctx("owner-ida"));
    await tool("expo_post").run({ module: 4, url: URL1, record }, ctx("owner-ida"));
    await tool("expo_post").run({ module: 3, url: URL1, record: { ...record, module: 3 } }, ctx("owner-bo")).catch(() => undefined);
    await tool("expo_post").run({ module: 5, url: URL1, record: { ...record, module: 5, plot: "N09", title: "Bo's secret" } }, ctx("owner-bo"));
    signedIn("owner-ida");
    const { res, body } = await me();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body.signedIn).toBe(true);
    expect(body.plot).toBe("N07");
    expect(body.parcels.map((p: { module: number }) => p.module)).toEqual([4, 2]);
    const [four, two] = body.parcels;
    expect(four).toEqual({
      module: 4,
      at: s.posts.get("N07")!["4"]!.at,
      title: "Tide clerks",
      counts: { pictures: 3, rejected: 1, references: 3, prompts: 1 },
      questions: s.handIns.get("N07/4")!.questions,
      answered: false,
    });
    expect(two.questions.map((q: { id: string }) => q.id)).toEqual(["decide", "world", "reference"]);
    expect(two.counts).toEqual({ pictures: 0, rejected: 0, references: 0, prompts: 0 });
    const text = JSON.stringify(body);
    for (const secret of ["Brass and wet stone", "Six fingers", "a tide clerk at a brass drawer", "Bo's secret", URL1, "@student.test"]) expect(text).not.toContain(secret);
  });
});

describe("POST /api/expo/answers", () => {
  const forParcel = (module = 4) => s.handIns.get(`N07/${module}`)!.questions.map((q) => ({ id: q.id, said: `  my answer to ${q.id}  `, pasted: q.id === "reference", ms: 41_000 }));

  beforeEach(async () => {
    await tool("expo_post").run({ module: 4, url: URL1, record }, ctx("owner-ida"));
  });

  it("needs the session", async () => {
    signedIn(null);
    const res = await answer({ module: 4, answers: forParcel() });
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the answers once, with the question as asked and when; a second time is 409", async () => {
    signedIn("owner-ida");
    const res = await answer({ module: 4, answers: forParcel() });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, module: 4 });
    const kept = s.handIns.get("N07/4")!;
    expect(kept.answers.map((a) => a.id)).toEqual(["reject", "reference", "business"]);
    expect(kept.answers[0]).toMatchObject({ id: "reject", asked: kept.questions[0]!.asked, said: "my answer to reject", pasted: false, ms: 41_000 });
    expect(typeof kept.answers[0]!.at).toBe("string");
    expect(kept.record?.answers).toEqual(kept.answers);
    expect((await me()).body.parcels[0].answered).toBe(true);
    expect((await answer({ module: 4, answers: forParcel() })).status).toBe(409);
    // a repost opens it again, with no answers
    await tool("expo_post").run({ module: 4, url: "https://claude.ai/artifact/ZzZz9999", record }, ctx("owner-ida"));
    expect(s.handIns.get("N07/4")!.answers).toEqual([]);
    expect((await answer({ module: 4, answers: forParcel() })).status).toBe(200);
  });

  it("takes exactly the parcel's questions, each answer 1 to 2000 characters after trim", async () => {
    signedIn("owner-ida");
    const good = forParcel();
    expect((await answer({ module: 4, answers: good.slice(0, 2) })).status).toBe(400);
    expect((await answer({ module: 4, answers: [...good.slice(0, 2), { ...good[0]!, id: "world" }] })).status).toBe(400);
    expect((await answer({ module: 4, answers: [good[0], good[0], good[1]] })).status).toBe(400);
    expect((await answer({ module: 4, answers: [{ ...good[0]!, said: "   " }, good[1], good[2]] })).status).toBe(400);
    expect((await answer({ module: 4, answers: [{ ...good[0]!, said: "x".repeat(2001) }, good[1], good[2]] })).status).toBe(400);
    expect((await answer({ module: 4, answers: [{ ...good[0]!, ms: -5 }, good[1], good[2]] })).status).toBe(400);
    expect((await answer({ module: 4, answers: [{ ...good[0]!, pasted: "no" }, good[1], good[2]] })).status).toBe(400);
    expect((await answer({ module: 4, answers: good, plot: "N09" })).status).toBe(400);
    expect((await answer({ module: 4, answers: good }, "text/plain")).status).toBe(415);
    expect(s.handIns.get("N07/4")!.answers).toEqual([]);
    expect((await answer({ module: 4, answers: [{ ...good[0]!, said: "y".repeat(2000) }, good[1], good[2]] })).status).toBe(200);
  });

  it("is rate limited per student, and says so without caching", async () => {
    limiter.real = true;
    try {
      signedIn("owner-ida");
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) statuses.push((await answer({ module: 4, answers: [] })).status);
      expect(statuses.slice(0, 10).every((x) => x === 400)).toBe(true);
      const limited = await answer({ module: 4, answers: [] });
      expect(limited.status).toBe(429);
      expect(limited.headers.get("cache-control")).toBe("no-store");
      expect(limited.headers.get("retry-after")).toBeTruthy();
    } finally {
      limiter.real = false;
    }
  });

  it("answers only the student's own parcels", async () => {
    signedIn("owner-bo");
    expect((await answer({ module: 4, answers: forParcel() })).status).toBe(404);
    signedIn("owner-nobody");
    expect((await answer({ module: 4, answers: forParcel() })).status).toBe(403);
    expect(s.handIns.get("N07/4")!.answers).toEqual([]);
  });

  it("takes answers to a parcel posted without a record, and keeps them with it", async () => {
    await tool("expo_post").run({ module: 2, url: URL1 }, ctx("owner-ida"));
    signedIn("owner-ida");
    const parcel = (await me()).body.parcels.find((p: { module: number }) => p.module === 2);
    const res = await answer({ module: 2, answers: parcel.questions.map((q: { id: string }) => ({ id: q.id, said: "because", pasted: false, ms: 0 })) });
    expect(res.status).toBe(200);
    expect(s.handIns.get("N07/2")).toMatchObject({ url: URL1, record: null, answers: [{ id: "decide" }, { id: "world" }, { id: "reference" }] });
  });
});

describe("expo_mailroom", () => {
  it("marks what was answered, and opens one whole hand-in for the teacher only", async () => {
    await tool("expo_post").run({ module: 4, url: URL1, record }, ctx("owner-ida"));
    await tool("expo_post").run({ module: 4, url: URL1 }, ctx("owner-bo"));
    signedIn("owner-ida");
    const qs = s.handIns.get("N07/4")!.questions;
    await answer({ module: 4, answers: qs.map((q) => ({ id: q.id, said: "an answer", pasted: false, ms: 1000 })) });
    const list = await tool("expo_mailroom").run({ module: 4 }, ctx("teacher", "admin"));
    expect(list.structuredContent?.rows).toEqual([
      expect.objectContaining({ plot: "N07", module: 4, answered: true }),
      expect.objectContaining({ plot: "N09", module: 4, answered: false }),
    ]);
    const one = await tool("expo_mailroom").run({ module: 4, plot: "n07" }, ctx("teacher", "admin"));
    const handIn = one.structuredContent?.handIn as { record: HandIn; questions: unknown[]; answers: unknown[] };
    expect(handIn.record.title).toBe("Tide clerks");
    expect(handIn.record.prompts).toHaveLength(1);
    expect(handIn.questions).toHaveLength(3);
    expect(handIn.answers).toHaveLength(3);
    expect(textOf(one)).toContain('"an answer"');
    expect((await tool("expo_mailroom").run({ module: 4, plot: "N07" }, ctx("owner-ida"))).isError).toBe(true);
    await expect(tool("expo_mailroom").run({ plot: "N07" }, ctx("teacher", "admin"))).rejects.toThrow(/Pass `module`/);
  });
});
