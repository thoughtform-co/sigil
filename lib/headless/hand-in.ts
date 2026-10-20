/**
 * The hand-in record, `expo.hand-in/2`: how one module's work was made, written by the course's
 * plugin and posted with `expo_post`. A strict mirror of the course's JSON schema
 * (`hand-in-2.schema.json`, kept with the plugin): every object refuses unknown keys, every string
 * has the schema's length limit, nothing is trimmed or rewritten. `prompts` and `answers` belong to
 * Sigil: the post fills `prompts` from the student's own draws and the game's post office writes
 * `answers`, whatever the caller sent in them.
 */

import { z } from "zod";

export const HAND_IN_SCHEMA = "expo.hand-in/2";
/** The largest record expo_post takes, serialised. */
export const HAND_IN_MAX_BYTES = 256 * 1024;

/** A string of at most `max` characters, counted as JSON Schema counts them (code points, so an emoji is one). */
const text = (max: number) => z.string().refine((s) => s.length <= max || [...s].length <= max, `at most ${max} characters`);
const quote = text(4000);
const line = text(400);
const path = text(300);

export const HandInPromptSchema = z.strictObject({
  model: text(80).optional(),
  prompt: text(8000).optional(),
  refs: z.number().int().min(0).optional(),
  at: z.string().optional(),
});
export type HandInPrompt = z.infer<typeof HandInPromptSchema>;

export const HandInAnswerSchema = z.strictObject({
  id: text(20).optional(),
  asked: text(400).optional(),
  said: text(2000).optional(),
  pasted: z.boolean().optional(),
  ms: z.number().int().min(0).optional(),
  at: z.string().optional(),
});
export type HandInAnswer = z.infer<typeof HandInAnswerSchema>;

export const HandInSchema = z.strictObject({
  schema: z.literal(HAND_IN_SCHEMA),
  module: z.number().int().min(1).max(9),
  student: text(60),
  plot: z.string().regex(/^(N[0-3][0-9])?$/).optional(),
  world: text(120).optional(),
  title: text(160).optional(),
  sub: text(400).optional(),
  hero: text(300).optional(),
  ask: z
    .strictObject({
      brief: quote.optional(),
      questions: z.array(z.strictObject({ asked: line.optional(), answer: quote.optional() })).max(30).optional(),
    })
    .optional(),
  look: z.strictObject({ said: quote.optional(), files: z.array(path).max(6).optional() }).optional(),
  references: z
    .array(
      z.strictObject({
        file: path,
        source: z.enum(["own-photo", "found", "film-still", "artwork", "screenshot", "other", ""]).optional(),
        from: line.optional(),
        said: quote.optional(),
      }),
    )
    .max(40)
    .optional(),
  idea: z.strictObject({ chosen: quote.optional(), why: quote.optional(), set_aside: z.array(quote).max(20).optional() }).optional(),
  direction: z.array(z.strictObject({ said: quote.optional(), about: line.optional(), then: line.optional() })).max(60).optional(),
  questions: z.array(quote).max(60).optional(),
  made: z
    .array(z.strictObject({ what: line.optional(), who: z.enum(["ai", "student", "both", ""]).optional(), note: line.optional() }))
    .max(60)
    .optional(),
  checked: z
    .array(z.strictObject({ file: path.optional(), failed: line.optional(), said: quote.optional(), why: line.optional(), fixed: path.optional() }))
    .max(60)
    .optional(),
  concept: z.strictObject({ logline: quote.optional(), audience: quote.optional(), platform: quote.optional() }).optional(),
  business: z
    .strictObject({
      format: z.enum(["series", "game", "live-experience", "branded-world", "collectible-ip", "creator-channel", "product", ""]).optional(),
      payer: quote.optional(),
      pays_for: quote.optional(),
      revenue: z.enum(["subscription", "ads", "licensing", "ticketing", "commerce", "sponsorship", "in-app", ""]).optional(),
      price: quote.optional(),
      price_source: line.optional(),
      comparable: quote.optional(),
      first_channel: quote.optional(),
      ip: z
        .strictObject({
          character: line.optional(),
          products: z.array(z.strictObject({ what: quote.optional(), file: path.optional() })).max(6).optional(),
        })
        .optional(),
      distribution: z.strictObject({ platform: quote.optional(), spec: line.optional() }).optional(),
      counter: quote.optional(),
    })
    .optional(),
  ladder: z
    .array(
      z.strictObject({
        format: quote.optional(),
        file: path.optional(),
        checks: z.array(z.strictObject({ id: text(20).optional(), passed: z.boolean().optional() })).max(20).optional(),
      }),
    )
    .max(3)
    .optional(),
  learned: quote.optional(),
  prompts: z.array(HandInPromptSchema).max(300).optional(),
  answers: z.array(HandInAnswerSchema).max(5).optional(),
});
export type HandIn = z.infer<typeof HandInSchema>;

/** Why a record was refused, in one line a student (or Claude) can act on. */
export function handInProblem(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "the record is not a valid expo.hand-in/2.";
  const where = issue.path.length ? issue.path.join(".") : "the record";
  return `${where}: ${issue.message}`;
}

/** Check a record as posted: its size, then the schema. Returns the record or the reason it was refused. */
export function parseHandIn(raw: unknown): { ok: true; record: HandIn } | { ok: false; reason: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "the record is a JSON object (the hand-in's expo.hand-in/2)." };
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(raw), "utf8");
  } catch {
    return { ok: false, reason: "the record could not be read as JSON." };
  }
  if (bytes > HAND_IN_MAX_BYTES) return { ok: false, reason: `the record is ${Math.ceil(bytes / 1024)} KB; at most 256 KB.` };
  const parsed = HandInSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: handInProblem(parsed.error) };
  return { ok: true, record: parsed.data };
}
