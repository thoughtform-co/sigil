/**
 * The keeper of the Expo's post offices, a brass robot pigeon, asks each posted hand-in three
 * questions in the game. They are chosen here, in code, from a fixed bank and filled from the
 * record: no model. The same record on the same plot and module always gets the same three; which
 * row of the record a question points at is picked by the seed, a hash of plot and module.
 *
 * Pick order: (1) `reject`, else `direction`, else `decide`; (2) `reference`, else `world`;
 * (3) from module 4 on `business`, else `world` if unused, else `decide`. Three distinct ids; when
 * the record leaves only two possible, the third is `reference` asked without a file. With no
 * record: `decide`, `world` and that same open `reference`.
 */

import type { HandIn } from "./hand-in";

export type KeeperId = "reject" | "direction" | "reference" | "world" | "business" | "decide";
export interface KeeperQuestion {
  id: KeeperId;
  asked: string;
}

/** The longest quote of the student's own words the keeper reads back. */
export const QUOTE_MAX = 120;

/** A stable 32-bit seed for a plot and module (FNV-1a). */
export function keeperSeed(plot: string, module: number): number {
  const key = `${plot}:${module}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

/** Cut a quote to at most `max` characters on a word boundary, marking the cut with an ellipsis. */
export function cutQuote(s: string, max = QUOTE_MAX): string {
  const t = s.replace(/\s+/g, " ").trim();
  const chars = [...t];
  if (chars.length <= max) return t;
  const head = chars.slice(0, max - 1).join("");
  const space = head.lastIndexOf(" ");
  const cut = (space > 0 ? head.slice(0, space) : head).replace(/[\s,;:.!?\-–—]+$/, "");
  return `${cut}…`;
}

const filled = (s: string | undefined): string => (typeof s === "string" ? s.trim() : "");
/** A file as the student knows it: its name, not the folder path. */
const fileName = (p: string): string => p.trim().split(/[\\/]/).filter(Boolean).pop() ?? p.trim();

/** One of a list, chosen by the seed; `salt` keeps two picks from the same seed independent. */
function pick<T>(list: T[], seed: number, salt: number): T {
  const h = Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0, 2246822519) >>> 0;
  return list[h % list.length]!;
}

const OPEN_REFERENCE = "Which picture on your board matters most, and why?";
const DECIDE = "What did you decide in this module that Claude could not have decided for you?";
const world = (name: string): string => `What would never happen in ${name || "your world"}?`;

/** The keeper's three questions for a hand-in. Pure and deterministic. */
export function questionsFor(record: HandIn | null, module: number, seed: number): KeeperQuestion[] {
  const decide: KeeperQuestion = { id: "decide", asked: DECIDE };
  const openReference: KeeperQuestion = { id: "reference", asked: OPEN_REFERENCE };
  if (!record) return [decide, { id: "world", asked: world("") }, openReference];

  const rejected = (record.checked ?? []).map((c) => filled(c.file)).filter(Boolean);
  const directions = (record.direction ?? []).map((d) => filled(d.said)).filter(Boolean);
  const boardFiles = [...(record.references ?? []).map((r) => filled(r.file)), ...(record.look?.files ?? []).map(filled)].filter(Boolean);
  const business = record.business;
  const payer = filled(business?.payer), comparable = filled(business?.comparable);

  const reject: KeeperQuestion | null = rejected.length
    ? { id: "reject", asked: `You sent back ${fileName(pick(rejected, seed, 1))}. What was wrong with it, to your eye?` }
    : null;
  const direction: KeeperQuestion | null = directions.length
    ? { id: "direction", asked: `You told Claude: "${cutQuote(pick(directions, seed, 2))}". What did you see that made you say it?` }
    : null;
  const reference: KeeperQuestion | null = boardFiles.length
    ? { id: "reference", asked: `Why is ${fileName(pick(boardFiles, seed, 3))} on your board, and not something else?` }
    : null;
  const worldQ: KeeperQuestion = { id: "world", asked: world(filled(record.world)) };
  const businessQ: KeeperQuestion | null =
    module >= 4 && (payer || comparable)
      ? { id: "business", asked: `Who pays for this, and why you rather than ${comparable ? cutQuote(comparable) : "what they buy now"}?` }
      : null;

  const first = reject ?? direction ?? decide;
  const second = reference ?? worldQ;
  const used = new Set<KeeperId>([first.id, second.id]);
  const third =
    businessQ ??
    (!used.has("world") ? worldQ : null) ??
    (!used.has("decide") ? decide : null) ??
    // Only world and decide were possible, and both are taken: ask about the board without a file.
    openReference;
  return [first, second, third];
}
