import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { applyOps, emptyPlot, ExpoInputError, setExpoStore, stateOf, type Assignments, type ExpoStore, type PlotDoc } from "@/lib/headless/expo";
import { EXPO_TOOLS } from "@/lib/headless/expo-tools";
import type { ToolContext } from "@/lib/headless/tools";
import { GET } from "@/app/api/expo/state/route";

const OUT = "https://x.supabase.co/storage/v1/object/public/outputs/";
const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", EXPO_PUBLIC_URL: "https://sigil.test/expo/" } as unknown as NodeJS.ProcessEnv;
const tool = (name: string) => EXPO_TOOLS.find((t) => t.name === name)!;
const ctx = (ownerId: string, ownerRole = "user"): ToolContext => ({ principal: { credentialId: "c", ownerId, ownerRole }, waitUntil: () => undefined, env });
const textOf = (r: { content: { type: string; text?: string }[] }) => r.content.map((c) => c.text ?? "").join("\n");

function memoryStore(users: Record<string, string> = {}): ExpoStore & { files: Map<string, PlotDoc>; assignments: Assignments } {
  const files = new Map<string, PlotDoc>();
  let assignments: Assignments = {};
  return {
    files,
    get assignments() {
      return assignments;
    },
    readPlot: async (p) => structuredClone(files.get(`${p}`) ?? null),
    readVersion: async (p, v) => structuredClone(files.get(`${p}/v${v}`) ?? null),
    async writePlot(doc) {
      files.set(`${doc.plot}/v${doc.version}`, structuredClone(doc));
      files.set(doc.plot, structuredClone(doc));
    },
    listPlots: async () => [...files.entries()].filter(([k]) => /^N\d\d$/.test(k)).map(([, d]) => structuredClone(d)),
    readAssignments: async () => structuredClone(assignments),
    async writeAssignments(a) {
      assignments = structuredClone(a);
    },
    findOwnerByEmail: async (email) => users[email.toLowerCase()] ?? null,
  };
}

describe("an area's operations", () => {
  const base = emptyPlot("N07");

  it("places a machine where the plot is free, naming it", () => {
    const { doc, changes } = applyOps(base, [{ op: "place", kind: "heatSinkSpire", u: 4.6, v: 7.4 }], OUT);
    expect(doc.items).toEqual([{ id: "heatsinkspire-1", kind: "heatSinkSpire", u: 4.6, v: 7.4, rot: 0, scale: 1 }]);
    expect(changes[0]).toContain("placed heatsinkspire-1");
  });

  it("keeps the venue hall, its approach, the plot's edge and the monument's plaza clear", () => {
    const at = (u: number, v: number) => () => applyOps(base, [{ op: "place", kind: "tree", u, v }], OUT);
    expect(at(-4, 2)).toThrow(/venue hall/);
    expect(at(0, 3)).toThrow(/approach/);
    expect(at(6.8, 7)).toThrow(/out of the plot/);
    expect(at(0.5, 8.2)).toThrow(/monument/);
    expect(at(-5, 11)).not.toThrow();
  });

  it("refuses what is not in the catalogue, and a twenty-first thing", () => {
    expect(() => applyOps(base, [{ op: "place", kind: "castle", u: 4, v: 10 }], OUT)).toThrow(ExpoInputError);
    const full: PlotDoc = { ...base, items: Array.from({ length: 20 }, (_, i) => ({ id: `lamp-${i + 1}`, kind: "lamp" as const, u: -6 + (i % 10) * 1.3, v: 12 + Math.floor(i / 10) * 0.8, rot: 0, scale: 1 })) };
    expect(() => applyOps(full, [{ op: "place", kind: "lamp", u: 5, v: 9 }], OUT)).toThrow(/at most 20/);
  });

  it("moves, removes and sets, and only takes files Sigil made", () => {
    const one = applyOps(base, [{ op: "place", kind: "fountain", u: 4.5, v: 11, id: "fountain-a" }], OUT).doc;
    const two = applyOps(one, [{ op: "move", id: "fountain-a", u: -4.5, rot: 450 }, { op: "set", student: "Ida", hue: "#e08aa0", venue: "gallery", avatar: `${OUT}u/g/avatar.glb` }], OUT).doc;
    expect(two.items[0]).toMatchObject({ u: -4.5, v: 11, rot: 90 });
    expect(two).toMatchObject({ student: "Ida", hue: "#e08aa0", venue: "gallery", avatar: `${OUT}u/g/avatar.glb` });
    expect(() => applyOps(two, [{ op: "set", avatar: "https://elsewhere.example/a.glb" }], OUT)).toThrow(/Sigil made/);
    expect(() => applyOps(two, [{ op: "set", tagline: "<script>" }], OUT)).toThrow(ExpoInputError);
    expect(applyOps(two, [{ op: "remove", id: "fountain-a" }], OUT).doc.items).toEqual([]);
  });

  it("will not set the monument down on something", () => {
    const one = applyOps(base, [{ op: "place", kind: "kiosk", u: 4, v: 11, id: "k" }], OUT).doc;
    expect(() => applyOps(one, [{ op: "set", monument: { u: 3, v: 10.5 } }], OUT)).toThrow(/move it first/);
    expect(applyOps(one, [{ op: "set", monument: { type: "helix", u: -3, v: 9.5 } }], OUT).doc.monument).toEqual({ type: "helix", u: -3, v: 9.5 });
  });
});

describe("the expo tools", () => {
  let s: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    s = memoryStore({ "ida@student.test": "owner-ida", "bo@student.test": "owner-bo" });
    setExpoStore(s);
  });
  afterEach(() => setExpoStore(null));

  it("say plainly when a student has no area yet", async () => {
    const r = await tool("expo_my_area").run({}, ctx("owner-ida"));
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/teacher assigns/);
  });

  it("let only a teacher assign, by the address the student signs in with", async () => {
    expect((await tool("expo_assign").run({ plot: "N07", email: "ida@student.test" }, ctx("owner-bo"))).isError).toBe(true);
    const r = await tool("expo_assign").run({ plot: "N07", email: "IDA@student.test", label: "Ida" }, ctx("teacher", "admin"));
    expect(textOf(r)).toContain("N07 is now Ida's");
    expect(s.assignments.N07?.ownerId).toBe("owner-ida");
    // one plot each: assigning again moves her
    await tool("expo_assign").run({ plot: "N09", email: "ida@student.test" }, ctx("teacher", "admin"));
    expect(s.assignments.N07).toBeUndefined();
    expect(s.assignments.N09?.ownerId).toBe("owner-ida");
    expect((await tool("expo_assign").run({ plot: "N10", email: "nobody@student.test" }, ctx("teacher", "admin"))).isError).toBe(true);
  });

  it("change only the student's own plot, whatever the call names", async () => {
    await tool("expo_assign").run({ plot: "N07", email: "ida@student.test" }, ctx("teacher", "admin"));
    const ok = await tool("expo_edit").run({ operations: [{ op: "place", kind: "conifer", u: 5, v: 12 }] }, ctx("owner-ida"));
    expect(textOf(ok)).toContain("Saved N07 as version 1");
    expect(s.files.get("N07")?.items).toHaveLength(1);
    expect(s.files.has("N07/v1")).toBe(true);
    const other = await tool("expo_edit").run({ plot: "N08", operations: [{ op: "remove", id: "x" }] }, ctx("owner-ida"));
    expect(other.isError).toBe(true);
    expect(s.files.has("N08")).toBe(false);
    // a teacher may work on any plot
    const t = await tool("expo_edit").run({ plot: "N08", operations: [{ op: "set", student: "Sample" }] }, ctx("teacher", "admin"));
    expect(textOf(t)).toContain("Saved N08");
  });

  it("undo walks back one change at a time, and stops at the bare plot", async () => {
    await tool("expo_assign").run({ plot: "N07", email: "ida@student.test" }, ctx("teacher", "admin"));
    const edit = (ops: unknown[]) => tool("expo_edit").run({ operations: ops }, ctx("owner-ida"));
    await edit([{ op: "place", kind: "tree", u: 5, v: 12, id: "a" }]);
    await edit([{ op: "place", kind: "tree", u: -5, v: 12, id: "b" }]);
    await tool("expo_undo").run({}, ctx("owner-ida"));
    expect(s.files.get("N07")?.items.map((i) => i.id)).toEqual(["a"]);
    await tool("expo_undo").run({}, ctx("owner-ida"));
    expect(s.files.get("N07")?.items).toEqual([]);
    expect(textOf(await tool("expo_undo").run({}, ctx("owner-ida")))).toMatch(/no changes to undo/);
  });
});

describe("the live state", () => {
  afterEach(() => setExpoStore(null));

  it("tags the state by every plot's version", () => {
    const a = stateOf([{ ...emptyPlot("N01"), version: 1 }]);
    const b = stateOf([{ ...emptyPlot("N01"), version: 2 }]);
    expect(a.etag).not.toBe(b.etag);
    expect(JSON.parse(a.body).plots.N01.version).toBe(1);
  });

  it("is served open to the game, cached two seconds, and answers 304 when nothing moved", async () => {
    const s = memoryStore();
    await s.writePlot({ ...emptyPlot("N03"), version: 4 });
    setExpoStore(s);
    const res = await GET(new Request("https://sigil.test/api/expo/state"));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cache-control")).toContain("s-maxage=2");
    expect((await res.json()).plots.N03.version).toBe(4);
    const again = await GET(new Request("https://sigil.test/api/expo/state", { headers: { "If-None-Match": res.headers.get("etag")! } }));
    expect(again.status).toBe(304);
  });
});
