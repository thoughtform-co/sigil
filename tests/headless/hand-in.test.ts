import { describe, expect, it } from "vitest";
import { HandInSchema, parseHandIn, type HandIn } from "@/lib/headless/hand-in";
import sample from "./fixtures/hand-in-sample.json";

// The sample is accepted by the course's JSON schema (hand-in-2.schema.json); every bad record
// below is refused by it too. The zod mirror must agree on both.
const good = sample as unknown as HandIn;

describe("the hand-in record (expo.hand-in/2)", () => {
  it("accepts a record the schema accepts, unchanged", () => {
    const r = parseHandIn(structuredClone(sample));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record).toEqual(sample);
    expect(HandInSchema.safeParse({ schema: "expo.hand-in/2", module: 1, student: "Bo" }).success).toBe(true);
    expect(HandInSchema.safeParse({ ...good, plot: "" }).success).toBe(true);
  });

  it.each([
    ["an unknown key", { ...good, extra: 1 }],
    ["an unknown key deep down", { ...good, look: { ...good.look, colour: "red" } }],
    ["a module past 9", { ...good, module: 10 }],
    ["a module that is not whole", { ...good, module: 2.5 }],
    ["a plot that is not one", { ...good, plot: "X07" }],
    ["another schema", { ...good, schema: "expo.hand-in/1" }],
    ["no student", Object.fromEntries(Object.entries(good).filter(([k]) => k !== "student"))],
    ["a reference without a file", { ...good, references: [{ said: "no file" }] }],
    ["a format not in the list", { ...good, business: { ...good.business, format: "film" } }],
    ["a title too long", { ...good, title: "x".repeat(161) }],
    ["too many look files", { ...good, look: { files: Array.from({ length: 7 }, (_, i) => `f${i}.png`) } }],
    ["a negative ms", { ...good, answers: [{ id: "decide", ms: -1 }] }],
    ["a prompt row with an unknown key", { ...good, prompts: [{ model: "m", prompt: "p", seed: 3 }] }],
  ])("refuses %s", (_what, bad) => {
    expect(HandInSchema.safeParse(bad).success).toBe(false);
    const r = parseHandIn(bad);
    expect(r.ok).toBe(false);
  });

  it("counts length as the schema does, an emoji as one character", () => {
    expect(HandInSchema.safeParse({ ...good, student: "🐦".repeat(60) }).success).toBe(true);
    expect(HandInSchema.safeParse({ ...good, student: "🐦".repeat(61) }).success).toBe(false);
  });

  it("refuses what is not an object, and a record over 256 KB", () => {
    expect(parseHandIn("{}").ok).toBe(false);
    expect(parseHandIn([good]).ok).toBe(false);
    // Valid by the schema in every field, too big as a whole.
    const big = { ...good, direction: Array.from({ length: 60 }, () => ({ said: "y".repeat(4000), about: "a".repeat(400), then: "b".repeat(400) })) };
    expect(HandInSchema.safeParse(big).success).toBe(true);
    const r = parseHandIn(big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/256 KB/);
  });

  it("says where a record went wrong", () => {
    const r = parseHandIn({ ...good, references: [{ said: "no file" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^references\.0\.file/);
  });
});
