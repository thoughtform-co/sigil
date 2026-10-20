import { describe, expect, it } from "vitest";
import type { HandIn } from "@/lib/headless/hand-in";
import { cutQuote, keeperSeed, questionsFor } from "@/lib/headless/keeper";
import sample from "./fixtures/hand-in-sample.json";

const full = sample as unknown as HandIn;
const bare = (module: number, extra: Partial<HandIn> = {}): HandIn => ({ schema: "expo.hand-in/2", module, student: "Ida", ...extra });
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);
const seed = keeperSeed("N07", 4);

describe("the keeper's questions", () => {
  it("asks about a rejected picture first, by its file name", () => {
    const qs = questionsFor(full, 4, seed);
    expect(qs[0]).toEqual({ id: "reject", asked: "You sent back tide-clerk-v2.png. What was wrong with it, to your eye?" });
  });

  it("else reads back what the student told Claude", () => {
    const qs = questionsFor(bare(2, { direction: [{ about: "sky" }, { said: "Make it colder." }] }), 2, seed);
    expect(qs[0]).toEqual({ id: "direction", asked: 'You told Claude: "Make it colder.". What did you see that made you say it?' });
  });

  it("else asks what the student decided", () => {
    expect(questionsFor(bare(2, { checked: [{ failed: "hands" }], direction: [{ said: "  " }] }), 2, seed)[0]?.id).toBe("decide");
  });

  it("asks about a file on the board second, from the references or the look", () => {
    const fromLook = questionsFor(bare(2, { look: { files: ["a/b/brass.jpg"] } }), 2, seed);
    expect(fromLook[1]).toEqual({ id: "reference", asked: "Why is brass.jpg on your board, and not something else?" });
    const fromRefs = questionsFor(bare(2, { references: [{ file: "x/harbour.jpg" }] }), 2, seed);
    expect(fromRefs[1]?.asked).toContain("harbour.jpg");
  });

  it("else asks about the world, by its name or as 'your world'", () => {
    expect(questionsFor(bare(2, { world: "The Salt Archive" }), 2, seed)[1]).toEqual({ id: "world", asked: "What would never happen in The Salt Archive?" });
    expect(questionsFor(bare(2), 2, seed)[1]).toEqual({ id: "world", asked: "What would never happen in your world?" });
  });

  it("from module 4 asks who pays, against the comparable or what they buy now", () => {
    expect(questionsFor(full, 4, seed)[2]).toEqual({ id: "business", asked: "Who pays for this, and why you rather than Love, Death & Robots?" });
    const payerOnly = questionsFor(bare(5, { business: { payer: "A museum." } }), 5, seed);
    expect(payerOnly[2]).toEqual({ id: "business", asked: "Who pays for this, and why you rather than what they buy now?" });
  });

  it("before module 4 never asks about business; the third is world if unused, else decide", () => {
    const early = questionsFor({ ...full, module: 3 }, 3, seed);
    expect(ids(early)).toEqual(["reject", "reference", "world"]);
    expect(ids(questionsFor(bare(3, { checked: [{ file: "a.png" }] }), 3, seed))).toEqual(["reject", "world", "decide"]);
    expect(ids(questionsFor(bare(5, { references: [{ file: "a.png" }], business: { payer: "" } }), 5, seed))).toEqual(["decide", "reference", "world"]);
  });

  it("always asks three distinct questions, even when the record leaves only two possible", () => {
    const thin = questionsFor(bare(2), 2, seed);
    expect(ids(thin)).toEqual(["decide", "world", "reference"]);
    expect(thin[2]?.asked).toBe("Which picture on your board matters most, and why?");
    for (const rec of [full, bare(1), bare(6, { business: { comparable: "Pixar" } }), bare(2, { direction: [{ said: "x" }] })]) {
      for (let s = 0; s < 50; s++) {
        const qs = questionsFor(rec, rec.module, keeperSeed(`N${String(s % 36 + 1).padStart(2, "0")}`, s % 8 + 1));
        expect(qs).toHaveLength(3);
        expect(new Set(ids(qs)).size).toBe(3);
      }
    }
  });

  it("with no record: decide, world, and the board without a file", () => {
    expect(questionsFor(null, 4, seed)).toEqual([
      { id: "decide", asked: "What did you decide in this module that Claude could not have decided for you?" },
      { id: "world", asked: "What would never happen in your world?" },
      { id: "reference", asked: "Which picture on your board matters most, and why?" },
    ]);
  });

  it("is deterministic: the same record, plot and module get the same questions; the seed picks the row", () => {
    const many = bare(2, { checked: Array.from({ length: 12 }, (_, i) => ({ file: `pic-${i}.png` })) });
    expect(questionsFor(many, 2, keeperSeed("N07", 2))).toEqual(questionsFor(structuredClone(many), 2, keeperSeed("N07", 2)));
    expect(keeperSeed("N07", 2)).toBe(keeperSeed("N07", 2));
    expect(keeperSeed("N07", 2)).not.toBe(keeperSeed("N08", 2));
    const picked = new Set(Array.from({ length: 36 }, (_, i) => questionsFor(many, 2, keeperSeed(`N${String(i + 1).padStart(2, "0")}`, 2))[0]!.asked));
    expect(picked.size).toBeGreaterThan(3);
  });

  it("cuts a long quote at 120 characters, on a word", () => {
    const said = "The drawers should look like they have been opened every morning for a hundred years by the same tired clerk with wet hands and no gloves";
    const q = questionsFor(bare(2, { direction: [{ said }] }), 2, seed)[0]!;
    const quoted = /"(.*)"/.exec(q.asked)![1]!;
    expect([...quoted].length).toBeLessThanOrEqual(120);
    expect(quoted.endsWith("…")).toBe(true);
    const words = quoted.slice(0, -1);
    expect(said.startsWith(words)).toBe(true);
    expect(said[words.length]).toBe(" ");
    expect(cutQuote("short and sweet")).toBe("short and sweet");
    expect(cutQuote("x".repeat(200))).toHaveLength(120);
  });
});
