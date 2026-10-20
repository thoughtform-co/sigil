/**
 * Expo City's live areas (2026-10-17): each student of the AI storytelling course has one plot of
 * the Expo, and changes it by talking to Claude, which calls the expo_* tools here. An area is a
 * small JSON document per plot in the public outputs bucket (`expo/plots/N07.json`, cached two
 * seconds), with every version kept beside it for undo (`expo/plots/N07/v3.json`); which student
 * holds which plot is a private file in the references bucket (`expo/assignments.json`). The
 * hosted game reads every document through `GET /api/expo/state` and rebuilds a plot when its
 * version moves. One file per plot means two students never overwrite each other.
 *
 * The document is public: it carries what the student chose to show and nothing about who they
 * are beyond the first name they gave. Text is shown as text only, never as markup.
 *
 * The drone post (r06): a student posts each week's hand-in through Claude; the public document
 * gets only the module and when (`posted`), so the city flies the parcel; the hand-in's artifact
 * link is kept privately for the teacher (`expo/post/N07.json` in the references bucket). It mirrors
 * Canvas, which stays the hand-in that counts.
 *
 * The keeper (r07): a post may carry the hand-in's record (`expo.hand-in/2`, lib/headless/hand-in.ts).
 * It is kept privately beside the link (`expo/hand-in/N07/3.json` in the references bucket) with
 * the prompts Sigil drew for the student since their previous post, the keeper's three questions
 * (lib/headless/keeper.ts) and, once the student has answered them at the post office in the game
 * (`/api/expo/answers`), their answers. The public document learns nothing new.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERENCES_BUCKET } from "@/lib/supabase/storage";
import type { HandIn, HandInAnswer, HandInPrompt } from "./hand-in";
import { keeperSeed, questionsFor, type KeeperQuestion } from "./keeper";

export class ExpoInputError extends Error {}

export const PLOT_IDS = Array.from({ length: 36 }, (_, i) => `N${String(i + 1).padStart(2, "0")}`);
export const MONUMENTS = ["lattice", "discStalk", "openGlobe", "geodesic", "spikeSphere", "ring", "helix", "toroid", "crystal", "dish", "towerRoof"] as const;
export const VENUES = ["shop", "gallery", "expo"] as const;

/** What can stand on a plot: the city's eleven machine types and the fillers. `r` is the footprint's radius in tiles. */
export const CATALOGUE = {
  setbackCore: { r: 1.6, what: "a stepped Deco tower" },
  heatSinkSpire: { r: 1.6, what: "a spire of heat-sink fins" },
  capacitorSilos: { r: 1.6, what: "a cluster of capacitor silos" },
  inductorRotunda: { r: 1.6, what: "a round inductor hall with a coil band" },
  qfpHall: { r: 1.6, what: "a low chip-package hall with pins" },
  rackStrata: { r: 1.6, what: "stacked server racks" },
  coolingShell: { r: 1.6, what: "a cooling tower" },
  antennaLattice: { r: 1.6, what: "a lattice antenna mast" },
  moduleStack: { r: 1.6, what: "a stack of modules" },
  substationYard: { r: 1.6, what: "a fenced substation yard" },
  crystalPod: { r: 1.6, what: "a crystal pod" },
  tree: { r: 0.8, what: "a broadleaf tree" },
  conifer: { r: 0.8, what: "a conifer" },
  topiary: { r: 0.7, what: "a clipped topiary" },
  lamp: { r: 0.3, what: "a Deco lamp post" },
  banner: { r: 0.3, what: "a banner mast in the plot's colour" },
  kiosk: { r: 0.9, what: "a small kiosk" },
  fountain: { r: 1.2, what: "a round fountain" },
} as const;
export type ItemKind = keyof typeof CATALOGUE;
const KINDS = Object.keys(CATALOGUE) as [ItemKind, ...ItemKind[]];

/**
 * The plot's own frame, as the game builds it: `u` across the front edge from -7 to 7 (0 the
 * middle; negative is the venue hall's side, facing the plot from its street), `v` from the front
 * edge (0) to the back (14). The venue hall and the approach to it are always kept clear: they are
 * the way in.
 */
export const LIMITS = {
  items: 20,
  works: 8,
  hall: { u0: -6.7, v0: 0, u1: -1.1, v1: 5.3 },
  lane: { u0: -1.3, v0: 0, u1: 1.5, v1: 5.9 },
  monument: { r: 2.7, at: { u: 0, v: 8.2 } },
  text: { student: 40, invention: 60, tagline: 140, title: 80 },
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const TEXT = (max: number) => z.string().trim().min(1).max(max).refine((s) => !/[\u0000-\u001f<>]/.test(s), "no control characters or angle brackets");

export const ItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,24}$/),
    kind: z.enum(KINDS),
    u: z.number().min(-7).max(7),
    v: z.number().min(0).max(14),
    rot: z.number().min(0).max(360),
    scale: z.number().min(0.6).max(1.5),
    colour: z.string().regex(HEX).optional(),
  })
  .strict();
export type ExpoItem = z.infer<typeof ItemSchema>;

export const PlotDocSchema = z
  .object({
    plot: z.enum(PLOT_IDS as [string, ...string[]]),
    version: z.number().int().min(0),
    /** The version an undo goes back to (0: none). */
    previous: z.number().int().min(0),
    updatedAt: z.string(),
    student: TEXT(LIMITS.text.student).optional(),
    invention: TEXT(LIMITS.text.invention).optional(),
    tagline: TEXT(LIMITS.text.tagline).optional(),
    hue: z.string().regex(HEX).optional(),
    venue: z.enum(VENUES).optional(),
    monument: z
      .object({ type: z.enum([...MONUMENTS, "auto"]), u: z.number().min(-7).max(7), v: z.number().min(0).max(14) })
      .strict()
      .optional(),
    items: z.array(ItemSchema).max(LIMITS.items),
    avatar: z.string().url().optional(),
    works: z.array(z.object({ src: z.string().url(), title: TEXT(LIMITS.text.title).optional() }).strict()).max(LIMITS.works),
    /** The modules whose hand-in was posted at the drone post, and when. */
    posted: z.array(z.object({ module: z.number().int().min(1).max(8), at: z.string() }).strict()).max(8).optional(),
  })
  .strict();
export type PlotDoc = z.infer<typeof PlotDocSchema>;

export function emptyPlot(plot: string): PlotDoc {
  return { plot, version: 0, previous: 0, updatedAt: new Date(0).toISOString(), items: [], works: [] };
}

export type ExpoOp =
  | { op: "place"; kind: string; u: number; v: number; rot?: number; scale?: number; colour?: string; id?: string }
  | { op: "move"; id: string; u?: number; v?: number; rot?: number; scale?: number; colour?: string }
  | { op: "remove"; id: string }
  | {
      op: "set";
      student?: string | null;
      invention?: string | null;
      tagline?: string | null;
      hue?: string | null;
      venue?: string | null;
      monument?: { type?: string; u?: number; v?: number } | null;
      avatar?: string | null;
      works?: { src: string; title?: string }[];
    };

const inRect = (u: number, v: number, r: number, b: { u0: number; v0: number; u1: number; v1: number }) => {
  const du = Math.max(b.u0 - u, 0, u - b.u1), dv = Math.max(b.v0 - v, 0, v - b.v1);
  return Math.hypot(du, dv) < r;
};

/** Where something of radius r may stand: inside the plot, off the hall and its approach, clear of the monument. */
function placeError(u: number, v: number, r: number, monument: { u: number; v: number } | null): string | null {
  const m = 0.3;
  if (Math.abs(u) > 7 - r - m || v < r + m || v > 14 - r - m) return "it would stick out of the plot";
  if (inRect(u, v, r, LIMITS.hall)) return "the venue hall stands there (u -6.7 to -1.1, v 0 to 5.3), the way into your room";
  if (inRect(u, v, r, LIMITS.lane)) return "that is the approach to the hall (u -1.3 to 1.5, v 0 to 5.9), kept clear";
  if (monument && Math.hypot(u - monument.u, v - monument.v) < LIMITS.monument.r + 0.2 + r) return `it would stand in the monument's plaza (the monument is at u ${monument.u}, v ${monument.v})`;
  return null;
}

const round = (x: number) => Math.round(x * 100) / 100;
const num = (x: unknown, what: string): number => {
  if (typeof x !== "number" || !Number.isFinite(x)) throw new ExpoInputError(`${what} must be a number.`);
  return x;
};

/**
 * Apply a list of operations to a plot's document. Returns the new document (version not yet
 * moved on) and one line per change, or throws an ExpoInputError that says what to do instead.
 * `outputs` is the public outputs bucket's URL prefix: an avatar or a work must be something
 * Sigil made.
 */
export function applyOps(doc: PlotDoc, ops: ExpoOp[], outputs: string): { doc: PlotDoc; changes: string[] } {
  if (!Array.isArray(ops) || ops.length === 0) throw new ExpoInputError("Pass at least one operation.");
  if (ops.length > 30) throw new ExpoInputError("At most 30 operations per call.");
  const next: PlotDoc = structuredClone(doc);
  const changes: string[] = [];
  const mon = () => (next.monument ? { u: next.monument.u, v: next.monument.v } : LIMITS.monument.at);
  const sigilUrl = (url: unknown, what: string): string => {
    if (typeof url !== "string" || !url.startsWith(outputs) || url.includes("..")) {
      throw new ExpoInputError(`${what} must be a file Sigil made (a URL starting ${outputs}), such as a generate_3d model or a draw.`);
    }
    return url;
  };
  for (const [i, raw] of ops.entries()) {
    const at = `Operation ${i + 1}`;
    const op = raw as ExpoOp;
    switch (op?.op) {
      case "place": {
        if (!(op.kind in CATALOGUE)) throw new ExpoInputError(`${at}: "${String(op.kind)}" is not in the catalogue. Use one of: ${KINDS.join(", ")}.`);
        if (next.items.length >= LIMITS.items) throw new ExpoInputError(`${at}: a plot holds at most ${LIMITS.items} things; remove one first.`);
        const kind = op.kind as ItemKind;
        const u = round(num(op.u, `${at}: u`)), v = round(num(op.v, `${at}: v`));
        const scale = op.scale === undefined ? 1 : num(op.scale, `${at}: scale`);
        if (scale < 0.6 || scale > 1.5) throw new ExpoInputError(`${at}: scale runs from 0.6 to 1.5.`);
        const why = placeError(u, v, CATALOGUE[kind].r * scale, mon());
        if (why) throw new ExpoInputError(`${at}: cannot put ${CATALOGUE[kind].what} at u ${u}, v ${v}: ${why}.`);
        let id = op.id ?? "";
        if (!id) {
          let n = 1;
          while (next.items.some((it) => it.id === `${kind.toLowerCase()}-${n}`)) n++;
          id = `${kind.toLowerCase()}-${n}`;
        }
        if (next.items.some((it) => it.id === id)) throw new ExpoInputError(`${at}: there is already a thing called "${id}".`);
        const item = { id, kind, u, v, rot: op.rot === undefined ? 0 : ((num(op.rot, `${at}: rot`) % 360) + 360) % 360, scale, ...(op.colour ? { colour: op.colour } : {}) };
        const parsed = ItemSchema.safeParse(item);
        if (!parsed.success) throw new ExpoInputError(`${at}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}.`);
        next.items.push(parsed.data);
        changes.push(`placed ${id} (${CATALOGUE[kind].what}) at u ${u}, v ${v}`);
        break;
      }
      case "move": {
        const it = next.items.find((x) => x.id === op.id);
        if (!it) throw new ExpoInputError(`${at}: there is no thing called "${String(op.id)}". The plot holds: ${next.items.map((x) => x.id).join(", ") || "nothing yet"}.`);
        const u = op.u === undefined ? it.u : round(num(op.u, `${at}: u`)), v = op.v === undefined ? it.v : round(num(op.v, `${at}: v`));
        const scale = op.scale === undefined ? it.scale : num(op.scale, `${at}: scale`);
        if (scale < 0.6 || scale > 1.5) throw new ExpoInputError(`${at}: scale runs from 0.6 to 1.5.`);
        const why = placeError(u, v, CATALOGUE[it.kind].r * scale, mon());
        if (why) throw new ExpoInputError(`${at}: cannot move ${it.id} to u ${u}, v ${v}: ${why}.`);
        Object.assign(it, { u, v, scale });
        if (op.rot !== undefined) it.rot = ((num(op.rot, `${at}: rot`) % 360) + 360) % 360;
        if (op.colour !== undefined) {
          if (!HEX.test(op.colour)) throw new ExpoInputError(`${at}: colour is a hex colour like #e08aa0.`);
          it.colour = op.colour;
        }
        changes.push(`moved ${it.id} to u ${u}, v ${v}`);
        break;
      }
      case "remove": {
        const k = next.items.findIndex((x) => x.id === op.id);
        if (k < 0) throw new ExpoInputError(`${at}: there is no thing called "${String(op.id)}".`);
        next.items.splice(k, 1);
        changes.push(`removed ${op.id}`);
        break;
      }
      case "set": {
        for (const key of ["student", "invention", "tagline"] as const) {
          if (op[key] === undefined) continue;
          if (op[key] === null || op[key] === "") delete next[key];
          else next[key] = String(op[key]);
          changes.push(`set ${key}`);
        }
        if (op.hue !== undefined) {
          if (op.hue === null) delete next.hue;
          else if (!HEX.test(op.hue)) throw new ExpoInputError(`${at}: hue is a hex colour like #e08aa0.`);
          else next.hue = op.hue;
          changes.push("set the colour");
        }
        if (op.venue !== undefined) {
          if (op.venue === null) delete next.venue;
          else if (!(VENUES as readonly string[]).includes(op.venue)) throw new ExpoInputError(`${at}: venue is shop, gallery or expo.`);
          else next.venue = op.venue as PlotDoc["venue"];
          changes.push("set the venue");
        }
        if (op.monument !== undefined) {
          if (op.monument === null) delete next.monument;
          else {
            const cur = next.monument ?? { type: "auto" as const, ...LIMITS.monument.at };
            const type = op.monument.type ?? cur.type;
            if (type !== "auto" && !(MONUMENTS as readonly string[]).includes(type)) throw new ExpoInputError(`${at}: the monument is one of: ${MONUMENTS.join(", ")}, or auto.`);
            const u = op.monument.u === undefined ? cur.u : round(num(op.monument.u, `${at}: monument.u`));
            const v = op.monument.v === undefined ? cur.v : round(num(op.monument.v, `${at}: monument.v`));
            const why = placeError(u, v, LIMITS.monument.r, null);
            if (why) throw new ExpoInputError(`${at}: the monument cannot stand at u ${u}, v ${v}: ${why}.`);
            const blocked = next.items.find((it) => Math.hypot(it.u - u, it.v - v) < LIMITS.monument.r + 0.2 + CATALOGUE[it.kind].r * it.scale);
            if (blocked) throw new ExpoInputError(`${at}: ${blocked.id} stands where the monument's plaza would be; move it first.`);
            next.monument = { type: type as NonNullable<PlotDoc["monument"]>["type"], u, v };
          }
          changes.push("set the monument");
        }
        if (op.avatar !== undefined) {
          if (op.avatar === null) delete next.avatar;
          else next.avatar = sigilUrl(op.avatar, `${at}: the avatar`);
          changes.push("set the avatar");
        }
        if (op.works !== undefined) {
          if (!Array.isArray(op.works) || op.works.length > LIMITS.works) throw new ExpoInputError(`${at}: works is a list of at most ${LIMITS.works}.`);
          next.works = op.works.map((wk, k) => ({ src: sigilUrl(wk?.src, `${at}: work ${k + 1}`), ...(wk?.title ? { title: String(wk.title) } : {}) }));
          changes.push(`hung ${next.works.length} work${next.works.length === 1 ? "" : "s"}`);
        }
        break;
      }
      default:
        throw new ExpoInputError(`${at}: op is place, move, remove or set.`);
    }
  }
  const checked = PlotDocSchema.safeParse(next);
  if (!checked.success) {
    const issue = checked.error.issues[0]!;
    throw new ExpoInputError(`That would make the area invalid: ${issue.path.join(".")} ${issue.message}.`);
  }
  return { doc: checked.data, changes };
}

/** A hand-in's artifact link, as the teacher opens it: claude.ai's own artifact pages only. */
export const ARTIFACT_LINK = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9-]{6,80}\/?(?:[?#].*)?$/;
/** The links behind a plot's parcels, private: module number to link and time. */
export type PostRecord = Record<string, { url: string; at: string }>;

export interface Assignment {
  ownerId: string;
  /** Who it is for, for the teacher's own reading (an address or a first name); never published. */
  label?: string;
  assignedAt: string;
}
export type Assignments = Record<string, Assignment>;

/**
 * A posted hand-in as the teacher's evaluator reads it, private: the link and when, the record with
 * Sigil's prompts filled in (null when the post carried none), the keeper's questions, and the
 * student's answers once given (each with the question as it was asked).
 */
export interface StoredHandIn {
  url: string;
  at: string;
  record: HandIn | null;
  questions: KeeperQuestion[];
  answers: HandInAnswer[];
}

/** Where the documents live; the tests swap in a memory store. */
export interface ExpoStore {
  readPlot(plot: string): Promise<PlotDoc | null>;
  readVersion(plot: string, version: number): Promise<PlotDoc | null>;
  /** Write the plot's current document and keep its version beside it. */
  writePlot(doc: PlotDoc): Promise<void>;
  listPlots(): Promise<PlotDoc[]>;
  readAssignments(): Promise<Assignments>;
  writeAssignments(a: Assignments): Promise<void>;
  /** The Sigil account behind an address, or null. */
  findOwnerByEmail(email: string): Promise<string | null>;
  readPost(plot: string): Promise<PostRecord>;
  writePost(plot: string, record: PostRecord): Promise<void>;
  readHandIn(plot: string, module: number): Promise<StoredHandIn | null>;
  /** Replace a module's stored hand-in. */
  writeHandIn(plot: string, module: number, handIn: StoredHandIn): Promise<void>;
}

const OUTPUTS = "outputs";
const plotPath = (plot: string) => `expo/plots/${plot}.json`;
const versionPath = (plot: string, v: number) => `expo/plots/${plot}/v${v}.json`;
const ASSIGNMENTS = "expo/assignments.json";
const postPath = (plot: string) => `expo/post/${plot}.json`;
const handInPath = (plot: string, module: number) => `expo/hand-in/${plot}/${module}.json`;

function parsePlot(text: string | null): PlotDoc | null {
  if (!text) return null;
  try {
    const parsed = PlotDocSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function supabaseExpoStore(): ExpoStore {
  const admin = createAdminClient();
  const read = async (bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) return null;
    return data.text();
  };
  const write = async (bucket: string, path: string, body: string, cacheControl: string) => {
    const { error } = await admin.storage.from(bucket).upload(path, Buffer.from(body, "utf8"), { upsert: true, contentType: "application/json", cacheControl });
    if (error) throw new Error(`Could not save ${path}: ${error.message}`);
  };
  return {
    readPlot: async (plot) => parsePlot(await read(OUTPUTS, plotPath(plot))),
    readVersion: async (plot, v) => parsePlot(await read(OUTPUTS, versionPath(plot, v))),
    async writePlot(doc) {
      const body = JSON.stringify(doc);
      await write(OUTPUTS, versionPath(doc.plot, doc.version), body, "31536000");
      await write(OUTPUTS, plotPath(doc.plot), body, "2");
    },
    async listPlots() {
      const { data, error } = await admin.storage.from(OUTPUTS).list("expo/plots", { limit: 100 });
      if (error || !data) return [];
      const files = data.map((f) => f.name).filter((n) => /^N\d\d\.json$/.test(n));
      const docs = await Promise.all(files.map(async (n) => parsePlot(await read(OUTPUTS, `expo/plots/${n}`))));
      return docs.filter((d): d is PlotDoc => !!d);
    },
    async readAssignments() {
      const text = await read(REFERENCES_BUCKET, ASSIGNMENTS);
      if (!text) return {};
      try {
        return JSON.parse(text) as Assignments;
      } catch {
        return {};
      }
    },
    writeAssignments: (a) => write(REFERENCES_BUCKET, ASSIGNMENTS, JSON.stringify(a, null, 1), "0"),
    async readPost(plot) {
      const text = await read(REFERENCES_BUCKET, postPath(plot));
      if (!text) return {};
      try {
        return JSON.parse(text) as PostRecord;
      } catch {
        return {};
      }
    },
    writePost: (plot, record) => write(REFERENCES_BUCKET, postPath(plot), JSON.stringify(record, null, 1), "0"),
    async readHandIn(plot, module) {
      const text = await read(REFERENCES_BUCKET, handInPath(plot, module));
      if (!text) return null;
      try {
        return JSON.parse(text) as StoredHandIn;
      } catch {
        return null;
      }
    },
    writeHandIn: (plot, module, handIn) => write(REFERENCES_BUCKET, handInPath(plot, module), JSON.stringify(handIn), "0"),
    async findOwnerByEmail(email) {
      const want = email.trim().toLowerCase();
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error || !data) return null;
        const hit = data.users.find((u) => u.email?.toLowerCase() === want);
        if (hit) return hit.id;
        if (data.users.length < 200) return null;
      }
      return null;
    },
  };
}

let store: ExpoStore | null = null;
export function expoStore(): ExpoStore {
  return (store ??= supabaseExpoStore());
}
/** Tests only. */
export function setExpoStore(s: ExpoStore | null): void {
  store = s;
}

/** The plot a person holds, if any. */
export async function plotOf(ownerId: string, s: ExpoStore = expoStore()): Promise<string | null> {
  const a = await s.readAssignments();
  return PLOT_IDS.find((p) => a[p]?.ownerId === ownerId) ?? null;
}

/** Save an edited document as the next version; `previous` says where an undo goes. */
export async function saveVersion(s: ExpoStore, before: PlotDoc, after: PlotDoc, previous: number): Promise<PlotDoc> {
  const doc: PlotDoc = { ...after, version: before.version + 1, previous, updatedAt: new Date().toISOString() };
  await s.writePlot(doc);
  return doc;
}

/** The hosted city, opened on a plot. */
export function expoLink(env: NodeJS.ProcessEnv, plot?: string): string {
  const base = (env.EXPO_PUBLIC_URL ?? "https://sigil.thoughtform.co/expo/").replace(/\/?$/, "/");
  return plot ? `${base}?select=${plot}` : base;
}

/** The public state the game polls: every area's document, and a tag that moves when any version does. */
export function stateOf(docs: PlotDoc[]): { body: string; etag: string } {
  const plots = Object.fromEntries(docs.sort((a, b) => a.plot.localeCompare(b.plot)).map((d) => [d.plot, d]));
  const tag = docs.map((d) => `${d.plot}:${d.version}`).join(",");
  let h = 2166136261;
  for (let i = 0; i < tag.length; i++) h = Math.imul(h ^ tag.charCodeAt(i), 16777619) >>> 0;
  return { body: JSON.stringify({ plots }), etag: `"expo-${h.toString(36)}-${docs.length}"` };
}

/** How far back a student's first post looks for the prompts they drew through Sigil. */
export const FIRST_POST_DAYS = 21;
/** The most prompts a hand-in carries, newest first. */
export const PROMPTS_MAX = 300;

/** The prompts a person drew through Sigil after `since`, newest first, at most `limit`. */
export type PromptsQuery = (ownerId: string, since: Date, limit: number) => Promise<HandInPrompt[]>;

const clip = (s: string, max: number) => ([...s].length <= max ? s : [...s].slice(0, max).join(""));

/** How many reference images a draw was given, when its parameters say. */
export function referenceCount(parameters: unknown): number | undefined {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) return undefined;
  const p = parameters as Record<string, unknown>;
  for (const key of ["referenceImages", "referenceImagePaths", "referenceImageUrls", "referenceImageIds"]) {
    if (Array.isArray(p[key])) return (p[key] as unknown[]).length;
  }
  for (const key of ["referenceImageUrl", "referenceImagePath", "referenceImageId", "referenceImage"]) {
    if (typeof p[key] === "string" && p[key]) return 1;
  }
  return undefined;
}

/** A Generation row as a hand-in's prompt: the model, the prompt, the references, when. */
export function promptOf(row: { modelId: string; prompt: string; parameters: unknown; createdAt: Date }): HandInPrompt {
  const refs = referenceCount(row.parameters);
  return { model: clip(row.modelId, 80), prompt: clip(row.prompt, 8000), ...(refs !== undefined ? { refs } : {}), at: row.createdAt.toISOString() };
}

export const prismaPromptsQuery: PromptsQuery = async (ownerId, since, limit) => {
  const rows = await prisma.generation.findMany({
    where: { userId: ownerId, createdAt: { gt: since } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { modelId: true, prompt: true, parameters: true, createdAt: true },
  });
  return rows.map(promptOf);
};

let promptsQuery: PromptsQuery | null = null;
export function expoPrompts(): PromptsQuery {
  return promptsQuery ?? prismaPromptsQuery;
}
/** Tests only. */
export function setPromptsQuery(q: PromptsQuery | null): void {
  promptsQuery = q;
}

/**
 * Where a post's prompts start: the student's previous post (the latest other module posted before
 * this one first was, so a repost keeps the week's prompts), or FIRST_POST_DAYS back for a first.
 */
export function promptsSince(post: PostRecord, module: number, now: Date): Date {
  const mine = post[String(module)]?.at;
  const before = Object.entries(post)
    .filter(([m, v]) => m !== String(module) && typeof v?.at === "string" && (!mine || v.at < mine))
    .map(([, v]) => v.at)
    .sort();
  const last = before.at(-1);
  const t = last ? Date.parse(last) : NaN;
  return Number.isFinite(t) ? new Date(t) : new Date(now.getTime() - FIRST_POST_DAYS * 86_400_000);
}

/** What a parcel's card shows: how much went into the hand-in. */
export interface ParcelCounts {
  /** The work's own pictures: the hero, the fixed versions, the ladder's key visuals, the products. */
  pictures: number;
  /** Pictures the student sent back (`checked` rows with a file). */
  rejected: number;
  /** Files on the board (`references` and `look.files`). */
  references: number;
  /** What Sigil drew for them since the previous post. */
  prompts: number;
}

export function countsOf(record: HandIn | null): ParcelCounts {
  if (!record) return { pictures: 0, rejected: 0, references: 0, prompts: 0 };
  const files = (xs: (string | undefined)[]) => new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean)).size;
  return {
    pictures: files([record.hero, ...(record.checked ?? []).map((c) => c.fixed), ...(record.ladder ?? []).map((l) => l.file), ...(record.business?.ip?.products ?? []).map((p) => p.file)]),
    rejected: (record.checked ?? []).filter((c) => (c.file ?? "").trim()).length,
    references: files([...(record.references ?? []).map((r) => r.file), ...(record.look?.files ?? [])]),
    prompts: record.prompts?.length ?? 0,
  };
}

/**
 * The parcel a posted module holds now. The post record is the truth about what was posted: a
 * stored hand-in counts only while its link and time are that post's. A post without a record (or
 * reposted without one) is still a parcel: the keeper asks it the questions for no record.
 */
export function currentParcel(plot: string, module: number, post: { url: string; at: string }, stored: StoredHandIn | null): StoredHandIn {
  if (stored && stored.url === post.url && stored.at === post.at) return stored;
  return { url: post.url, at: post.at, record: null, questions: questionsFor(null, module, keeperSeed(plot, module)), answers: [] };
}
