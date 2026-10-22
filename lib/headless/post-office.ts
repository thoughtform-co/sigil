/**
 * The post office in the game (r07): the keeper, a robot pigeon at every post office of Expo City,
 * reads a student's posted parcels and asks the three questions lib/headless/keeper.ts chose for
 * each. The game runs on Sigil's own origin (`/expo`), so it speaks with the student's Sigil session
 * cookie: `GET /api/expo/me` and `POST /api/expo/answers`, both private and never cached.
 *
 * What the game is told about a parcel is its card (module, title, counts) and its questions;
 * never the record's text, never another student's parcels. The answers are kept in the private
 * hand-in for the teacher's mailroom.
 */

import { z } from "zod";
import { countsOf, currentParcel, expoStore, plotOf, type ExpoStore, type ParcelCounts } from "./expo";
import type { HandInAnswer } from "./hand-in";
import type { KeeperQuestion } from "./keeper";
import { assignmentFor, type ExpoAssignment } from "./assignment";
import type { Avatar } from "./avatar";

/** The sign-in page, coming back to the post office in the game afterwards. */
export const POST_OFFICE_PATH = "/expo/?place=post";
export const SIGN_IN_URL = `/login?next=${encodeURIComponent(POST_OFFICE_PATH)}`;

export const SAID_MAX = 2000;

export interface Parcel {
  module: number;
  at: string;
  title: string;
  counts: ParcelCounts;
  questions: KeeperQuestion[];
  answered: boolean;
}

/**
 * The first run (2026-10-22) adds the student's own character and their first task: `avatar` as the
 * character creator kept it (lib/headless/avatar.ts; null until they keep one), `assignment` the
 * pigeon's parcel (lib/headless/assignment.ts; null once posted), and `threeD`, whether a 3D model
 * can be made from the views (Meshy configured), so the game offers the upgrade only then.
 */
export type Me =
  | { signedIn: false; signIn: string }
  | { signedIn: true; name: string | null; plot: string | null; parcels: Parcel[]; avatar: Avatar | null; assignment: ExpoAssignment | null; threeD: boolean };

/** What the keeper knows of the signed-in student: their name, their plot, their parcels newest module first, their avatar and assignment. */
export async function meOf(userId: string, profileName: string | null, s: ExpoStore = expoStore(), opts: { threeD?: boolean } = {}): Promise<Me> {
  const [plot, kept] = await Promise.all([plotOf(userId, s), s.readAvatar(userId).catch(() => null)]);
  const fallback = profileName && !profileName.includes("@") ? profileName.trim().slice(0, 60) || null : null;
  const avatar = kept?.avatar ?? null;
  const threeD = opts.threeD ?? false;
  if (!plot) return { signedIn: true, name: fallback, plot: null, parcels: [], avatar, assignment: assignmentFor([]), threeD };
  const [doc, post] = await Promise.all([s.readPlot(plot), s.readPost(plot)]);
  const modules = Object.keys(post)
    .map(Number)
    .filter((m) => Number.isInteger(m) && m >= 1)
    .sort((a, b) => b - a);
  const parcels = await Promise.all(
    modules.map(async (module): Promise<Parcel> => {
      const entry = post[String(module)]!;
      const parcel = currentParcel(plot, module, entry, await s.readHandIn(plot, module));
      return {
        module,
        at: entry.at,
        title: parcel.record?.title?.trim() ?? "",
        counts: countsOf(parcel.record),
        questions: parcel.questions.map(({ id, asked }) => ({ id, asked })),
        answered: parcel.answers.length > 0,
      };
    }),
  );
  return { signedIn: true, name: doc?.student ?? fallback, plot, parcels, avatar, assignment: assignmentFor(modules), threeD };
}

export const AnswersBodySchema = z.strictObject({
  module: z.number().int().min(1).max(8),
  answers: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(20),
        said: z.string(),
        pasted: z.boolean(),
        ms: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(5),
});

export type AnswerOutcome = { status: 200; body: { ok: true; module: number } } | { status: 400 | 403 | 404 | 409; body: { error: string; code: string } };

const refuse = (status: 400 | 403 | 404 | 409, code: string, error: string): AnswerOutcome => ({ status, body: { error, code } });

/** Keep a student's answers to a parcel's questions, once. */
export async function answerParcel(userId: string, body: unknown, s: ExpoStore = expoStore(), now: Date = new Date()): Promise<AnswerOutcome> {
  const parsed = AnswersBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return refuse(400, "invalid", `The answers are { module, answers: [{ id, said, pasted, ms }] }${issue ? ` (${issue.path.join(".") || "body"}: ${issue.message})` : ""}.`);
  }
  const { module, answers } = parsed.data;
  const plot = await plotOf(userId, s);
  if (!plot) return refuse(403, "no_plot", "No plot of the Expo is yours yet: the teacher assigns one first.");
  const entry = (await s.readPost(plot))[String(module)];
  if (!entry) return refuse(404, "no_parcel", `There is no parcel for module ${module}: post the hand-in first.`);
  const parcel = currentParcel(plot, module, entry, await s.readHandIn(plot, module));
  if (parcel.answers.length > 0) return refuse(409, "answered", `The parcel for module ${module} is already stamped. Posting the hand-in again opens it again.`);

  const want: string[] = parcel.questions.map((q) => q.id);
  const ids = answers.map((a) => a.id);
  if (ids.length !== want.length || new Set(ids).size !== ids.length || !ids.every((id) => want.includes(id))) {
    return refuse(400, "questions", `Answer exactly the parcel's questions: ${want.join(", ")}.`);
  }
  const at = now.toISOString();
  const kept: HandInAnswer[] = [];
  for (const q of parcel.questions) {
    const a = answers.find((x) => x.id === q.id)!;
    const said = a.said.trim();
    const length = [...said].length;
    if (length < 1 || length > SAID_MAX) return refuse(400, "said", `Each answer is 1 to ${SAID_MAX} characters.`);
    kept.push({ id: q.id, asked: q.asked, said, pasted: a.pasted, ms: a.ms, at });
  }
  await s.writeHandIn(plot, module, { ...parcel, record: parcel.record ? { ...parcel.record, answers: kept } : null, answers: kept });
  return { status: 200, body: { ok: true, module } };
}
