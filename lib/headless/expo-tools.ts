/**
 * The expo_* tools: a student looks at and changes their own area of Expo City by talking to
 * Claude; the teacher assigns the areas. See lib/headless/expo.ts for the document and its limits.
 * A student can only ever touch the plot assigned to their own Sigil account: the plot comes from
 * the signed-in principal, never from what the call says.
 */

import type { McpTool, ToolContext, ToolResult } from "./tools";
import {
  ARTIFACT_LINK,
  CATALOGUE,
  ExpoInputError,
  LIMITS,
  MONUMENTS,
  PLOT_IDS,
  VENUES,
  PROMPTS_MAX,
  applyOps,
  countsOf,
  currentParcel,
  emptyPlot,
  expoLink,
  expoPrompts,
  expoStore,
  plotOf,
  promptsSince,
  saveVersion,
  type ExpoOp,
  type PlotDoc,
  type StoredHandIn,
} from "./expo";
import { parseHandIn } from "./hand-in";
import { keeperSeed, questionsFor } from "./keeper";

const say = (text: string, structuredContent?: Record<string, unknown>, isError = false): ToolResult => ({
  content: [{ type: "text", text }],
  ...(structuredContent ? { structuredContent } : {}),
  ...(isError ? { isError: true } : {}),
});

const isAdmin = (ctx: ToolContext) => ctx.principal.ownerRole === "admin";

function outputsPrefix(env: NodeJS.ProcessEnv): string {
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Sigil's storage address is not configured.");
  return `${base}/storage/v1/object/public/outputs/`;
}

/** The plot this call may touch: an admin may name any; everyone else gets their own, or a refusal. */
async function resolvePlot(args: Record<string, unknown>, ctx: ToolContext): Promise<{ plot: string } | { refusal: ToolResult }> {
  const asked = typeof args.plot === "string" ? args.plot.trim().toUpperCase() : undefined;
  if (asked !== undefined && !PLOT_IDS.includes(asked)) throw new ExpoInputError(`A plot is N01 to N36, not "${asked}".`);
  if (asked && isAdmin(ctx)) return { plot: asked };
  const own = await plotOf(ctx.principal.ownerId);
  if (!own) {
    return { refusal: say("No area of the Expo is yours yet. Your teacher assigns them: ask them to give you one, then try again.", { plot: null }, true) };
  }
  if (asked && asked !== own) return { refusal: say(`You can only change your own area, ${own}. ${asked} belongs to someone else.`, { plot: own }, true) };
  return { plot: own };
}

function describe(doc: PlotDoc, link: string): string {
  const lines = [
    `Area ${doc.plot}, version ${doc.version}. Watch it live: ${link}`,
    `Shown: ${[doc.student && `student "${doc.student}"`, doc.invention && `invention "${doc.invention}"`, doc.tagline && `tagline "${doc.tagline}"`, doc.hue && `colour ${doc.hue}`, doc.venue && `venue ${doc.venue}`].filter(Boolean).join(", ") || "nothing set yet"}.`,
    `Monument: ${doc.monument ? `${doc.monument.type} at u ${doc.monument.u}, v ${doc.monument.v}` : `the city's choice at u ${LIMITS.monument.at.u}, v ${LIMITS.monument.at.v}`}.`,
    `Avatar: ${doc.avatar ?? "none"}. Works hung: ${doc.works.length}.`,
    `Posted at the drone post: ${doc.posted?.length ? doc.posted.map((p) => `module ${p.module}`).join(", ") : "nothing yet"}.`,
    doc.items.length ? `Things on the plot (${doc.items.length} of ${LIMITS.items}):` : `Nothing placed yet (room for ${LIMITS.items}).`,
    ...doc.items.map((it) => `- ${it.id}: ${it.kind} at u ${it.u}, v ${it.v}${it.rot ? `, turned ${it.rot}°` : ""}${it.scale !== 1 ? `, scale ${it.scale}` : ""}${it.colour ? `, ${it.colour}` : ""}`),
  ];
  return lines.join("\n");
}

const FRAME =
  "The plot's frame: u runs across the front edge from -7 to 7 (0 is the middle; negative is the venue hall's side, seen from the street), v from the front edge (0) to the back (14). " +
  "The venue hall (u -6.7 to -1.1, v 0 to 5.3) and its approach (u -1.3 to 1.5, v 0 to 5.9) always stay clear: they are the way into the room. The monument keeps a plaza of 2.7 round it.";

const expoMyArea: McpTool = {
  name: "expo_my_area",
  title: "My area at the Expo",
  description:
    "Your own plot of Expo City, the course's living world fair: what stands on it now, the catalogue of things you can place, the plot's frame and limits, and the link to watch it live. Call this before changing anything.",
  inputSchema: {
    type: "object",
    properties: { plot: { type: "string", description: "Teachers only: look at this plot (N01 to N36) instead of their own." } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async run(args, ctx) {
    const r = await resolvePlot(args, ctx);
    if ("refusal" in r) return r.refusal;
    const doc = (await expoStore().readPlot(r.plot)) ?? emptyPlot(r.plot);
    const link = expoLink(ctx.env, r.plot);
    const catalogue = Object.entries(CATALOGUE).map(([kind, c]) => `${kind} (${c.what}, footprint ${c.r})`);
    const text = [
      describe(doc, link),
      "",
      `Catalogue: ${catalogue.join("; ")}.`,
      `Monuments: ${MONUMENTS.join(", ")}, or auto. Venues: ${VENUES.join(", ")}.`,
      FRAME,
      "Change it with expo_edit (place, move, remove, set); undo the last change with expo_undo. An avatar or a hung work must be a file Sigil made for you (a generate_3d model, a draw).",
    ].join("\n");
    return say(text, { plot: r.plot, link, doc, catalogue: CATALOGUE, limits: LIMITS });
  },
};

const OP_SCHEMA = {
  type: "object",
  description:
    "One change. place: {op, kind, u, v, rot?, scale?, colour?, id?}. move: {op, id, u?, v?, rot?, scale?, colour?}. remove: {op, id}. set: {op, student?, invention?, tagline?, hue?, venue?, monument?: {type?, u?, v?}, avatar?, works?: [{src, title?}]} (null clears a field).",
  properties: {
    op: { type: "string", enum: ["place", "move", "remove", "set"] },
    kind: { type: "string", enum: Object.keys(CATALOGUE) },
    id: { type: "string" },
    u: { type: "number", minimum: -7, maximum: 7 },
    v: { type: "number", minimum: 0, maximum: 14 },
    rot: { type: "number", description: "Degrees." },
    scale: { type: "number", minimum: 0.6, maximum: 1.5 },
    colour: { type: "string", description: "Hex, like #e08aa0." },
    student: { type: ["string", "null"], description: "First name only." },
    invention: { type: ["string", "null"] },
    tagline: { type: ["string", "null"] },
    hue: { type: ["string", "null"], description: "The area's colour, hex." },
    venue: { type: ["string", "null"], enum: [...VENUES, null] },
    monument: { type: ["object", "null"] },
    avatar: { type: ["string", "null"], description: "The URL of a GLB generate_3d made for you." },
    works: { type: "array", items: { type: "object" } },
  },
  required: ["op"],
};

const expoEdit: McpTool = {
  name: "expo_edit",
  title: "Change my area",
  description:
    "Change your own plot of Expo City: place things from the catalogue, move or remove them, set your name, invention, tagline, colour, venue, monument, avatar and hung works. Every change is checked against the plot's limits and saved as a new version; the live city shows it within seconds.",
  inputSchema: {
    type: "object",
    properties: {
      operations: { type: "array", minItems: 1, maxItems: 30, items: OP_SCHEMA },
      plot: { type: "string", description: "Teachers only: change this plot instead of their own." },
    },
    required: ["operations"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx) {
    const r = await resolvePlot(args, ctx);
    if ("refusal" in r) return r.refusal;
    const s = expoStore();
    const before = (await s.readPlot(r.plot)) ?? emptyPlot(r.plot);
    const { doc, changes } = applyOps(before, args.operations as ExpoOp[], outputsPrefix(ctx.env));
    const saved = await saveVersion(s, before, doc, before.version);
    const link = expoLink(ctx.env, r.plot);
    return say(`Saved ${r.plot} as version ${saved.version}: ${changes.join("; ")}. It shows in the live city within a few seconds: ${link}`, { plot: r.plot, version: saved.version, changes, link, doc: saved });
  },
};

const expoUndo: McpTool = {
  name: "expo_undo",
  title: "Undo my last change",
  description: "Take your plot of Expo City back to how it was before the last change. Call it again to go back further.",
  inputSchema: {
    type: "object",
    properties: { plot: { type: "string", description: "Teachers only: undo on this plot." } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx) {
    const r = await resolvePlot(args, ctx);
    if ("refusal" in r) return r.refusal;
    const s = expoStore();
    const now = await s.readPlot(r.plot);
    const bare = (d: PlotDoc) => !d.items.length && !d.works.length && !d.student && !d.invention && !d.tagline && !d.hue && !d.venue && !d.monument && !d.avatar;
    if (!now || now.version === 0 || (now.previous === 0 && bare(now))) return say(`${r.plot} has no changes to undo.`, { plot: r.plot });
    const back = now.previous > 0 ? await s.readVersion(r.plot, now.previous) : null;
    const target = back ?? emptyPlot(r.plot);
    const saved = await saveVersion(s, now, { ...target, plot: r.plot }, back ? back.previous : 0);
    const link = expoLink(ctx.env, r.plot);
    return say(`Undone: ${r.plot} is back as it was at version ${back ? back.version : 0}, saved as version ${saved.version}. ${link}`, { plot: r.plot, version: saved.version, link, doc: saved });
  },
};

const expoAssign: McpTool = {
  name: "expo_assign",
  title: "Assign an area (teacher)",
  description:
    "Teachers only: give a plot of Expo City (N01 to N36) to a student's Sigil account, found by the address they sign in with, or clear it. Each student holds one plot; assigning moves them.",
  inputSchema: {
    type: "object",
    properties: {
      plot: { type: "string", description: "N01 to N36." },
      email: { type: "string", description: "The address the student signs in to Sigil with." },
      label: { type: "string", description: "A note for yourself (a first name); never published." },
      clear: { type: "boolean", description: "Take the plot back from whoever holds it." },
    },
    required: ["plot"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx) {
    if (!isAdmin(ctx)) return say("Only a teacher can assign areas of the Expo.", undefined, true);
    const plot = typeof args.plot === "string" ? args.plot.trim().toUpperCase() : "";
    if (!PLOT_IDS.includes(plot)) throw new ExpoInputError("`plot` is N01 to N36.");
    const s = expoStore();
    const a = await s.readAssignments();
    if (args.clear === true) {
      delete a[plot];
      await s.writeAssignments(a);
      return say(`${plot} is free again.`, { plot, assigned: false });
    }
    const email = typeof args.email === "string" ? args.email.trim() : "";
    if (!email.includes("@")) throw new ExpoInputError("Pass the student's `email`, or `clear: true`.");
    const ownerId = await s.findOwnerByEmail(email);
    if (!ownerId) return say("No Sigil account signs in with that address yet. Ask the student to sign in to Sigil once, then assign again.", { plot, assigned: false }, true);
    for (const p of PLOT_IDS) if (a[p]?.ownerId === ownerId && p !== plot) delete a[p];
    const label = typeof args.label === "string" && args.label.trim() ? args.label.trim().slice(0, 60) : email;
    a[plot] = { ownerId, label, assignedAt: new Date().toISOString() };
    await s.writeAssignments(a);
    return say(`${plot} is now ${label}'s. They see it with expo_my_area and change it with expo_edit; it is live at ${expoLink(ctx.env, plot)}`, { plot, assigned: true, label });
  },
};

const expoPost: McpTool = {
  name: "expo_post",
  title: "Post my hand-in",
  description:
    "The drone post at the Expo: post the week's hand-in for a module, with the artifact link of the hand-in page (claude.ai/artifact/...) and, when the hand-in has one, its record: pass the hand-in JSON (expo.hand-in/2, the same JSON the page embeds) as `record`, unchanged. The parcel flies from your quarter's post office to the Institute in the live city, a pennant goes up on your plot, and the teacher gets the link and the record. With a record, the keeper at your post office (a robot pigeon) has three questions about the work: the student answers them in the city, in their own words; do not answer them for the student. It mirrors Canvas: paste the same link into the assignment in Canvas too; the Canvas link stays the hand-in that counts.",
  inputSchema: {
    type: "object",
    properties: {
      module: { type: "integer", minimum: 1, maximum: 8, description: "The module (or step) the hand-in is for." },
      url: { type: "string", description: "The hand-in's artifact link, https://claude.ai/artifact/..." },
      record: {
        type: "object",
        description: "The hand-in's record, expo.hand-in/2, as the course plugin wrote it (hand-in-module-<n>.json), at most 256 KB. Its module must be this module; Sigil fills in `prompts` and `answers` itself.",
      },
      plot: { type: "string", description: "Teachers only: post for this plot." },
    },
    required: ["module", "url"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx) {
    const r = await resolvePlot(args, ctx);
    if ("refusal" in r) return r.refusal;
    const mod = typeof args.module === "number" ? args.module : NaN;
    if (!Number.isInteger(mod) || mod < 1 || mod > 8) throw new ExpoInputError("`module` is a whole number from 1 to 8.");
    const url = typeof args.url === "string" ? args.url.trim() : "";
    if (!ARTIFACT_LINK.test(url)) throw new ExpoInputError("`url` must be the hand-in's artifact link on claude.ai (https://claude.ai/artifact/...). Publish the hand-in page first.");
    const parsed = args.record === undefined ? null : parseHandIn(args.record);
    if (parsed && !parsed.ok) throw new ExpoInputError(`The record was refused: ${parsed.reason} Pass the hand-in JSON exactly as the plugin wrote it.`);
    const record = parsed?.ok ? parsed.record : null;
    if (record && record.module !== mod) throw new ExpoInputError(`The record is for module ${record.module}, not module ${mod}. Post it for its own module.`);
    if (record?.plot && record.plot !== r.plot) throw new ExpoInputError(`The record names plot ${record.plot}, but this post is for ${r.plot}.`);

    const s = expoStore();
    const now = new Date();
    const at = now.toISOString();
    const post = await s.readPost(r.plot);
    const again = Boolean(post[String(mod)]);
    let prompts = 0;
    if (record) {
      // The prompts are what the plot's student drew, also when a teacher posts for them.
      const owner = (await s.readAssignments())[r.plot]?.ownerId ?? ctx.principal.ownerId;
      const drawn = await expoPrompts()(owner, promptsSince(post, mod, now), PROMPTS_MAX);
      prompts = drawn.length;
      const stored: StoredHandIn = {
        url,
        at,
        record: { ...record, prompts: drawn, answers: [] },
        questions: questionsFor(record, mod, keeperSeed(r.plot, mod)),
        answers: [],
      };
      await s.writeHandIn(r.plot, mod, stored);
    }
    post[String(mod)] = { url, at };
    await s.writePost(r.plot, post);
    const before = (await s.readPlot(r.plot)) ?? emptyPlot(r.plot);
    const posted = [...(before.posted ?? []).filter((p) => p.module !== mod), { module: mod, at }].sort((a, b) => a.module - b.module);
    const saved = await saveVersion(s, before, { ...before, posted }, before.version);
    const link = expoLink(ctx.env, r.plot);
    const office = `${expoLink(ctx.env)}?place=post`;
    const keeper = record
      ? ` The record went with it (${prompts} prompt${prompts === 1 ? "" : "s"} from Sigil added). The keeper at your post office has three questions about this work: answer them yourself, in your own words, at ${office}.`
      : "";
    return say(
      `${again ? "Posted again" : "Posted"}: the hand-in for module ${mod} leaves ${r.plot} by drone for the Institute; watch it fly at ${link}.${keeper} Now paste the same link into the assignment in Canvas: Canvas is the hand-in that counts.`,
      { plot: r.plot, module: mod, version: saved.version, link, posted: posted.map((p) => p.module), record: Boolean(record), ...(record ? { prompts, office } : {}) },
    );
  },
};

const expoMailroom: McpTool = {
  name: "expo_mailroom",
  title: "The mailroom (teacher)",
  description:
    "Teachers only: who posted what at the drone post, per plot and module, with each hand-in's artifact link and whether the student has answered the keeper's questions. Given `plot` and `module`, the whole stored hand-in: the record with Sigil's prompts, the keeper's questions and the student's answers.",
  inputSchema: {
    type: "object",
    properties: {
      module: { type: "integer", minimum: 1, maximum: 8, description: "Only this module." },
      plot: { type: "string", description: "With `module`: open that plot's hand-in for the module." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async run(args, ctx) {
    if (!isAdmin(ctx)) return say("Only a teacher can open the mailroom.", undefined, true);
    const only = typeof args.module === "number" ? args.module : null;
    const s = expoStore();
    const a = await s.readAssignments();
    if (args.plot !== undefined) {
      const plot = typeof args.plot === "string" ? args.plot.trim().toUpperCase() : "";
      if (!PLOT_IDS.includes(plot)) throw new ExpoInputError(`A plot is N01 to N36, not "${String(args.plot)}".`);
      if (!only || !Number.isInteger(only)) throw new ExpoInputError("Pass `module` with `plot` to open a hand-in.");
      const entry = (await s.readPost(plot))[String(only)];
      if (!entry) return say(`${plot} has posted nothing for module ${only}.`, { plot, module: only, handIn: null });
      const handIn = currentParcel(plot, only, entry, await s.readHandIn(plot, only));
      const who = a[plot]?.label ?? "unassigned";
      const text = [
        `Module ${only} · ${plot} (${who}) · posted ${entry.at.slice(0, 16).replace("T", " ")} · ${entry.url}`,
        handIn.record ? `Record: "${handIn.record.title ?? ""}", ${handIn.record.prompts?.length ?? 0} prompts from Sigil.` : "Posted without a record.",
        `The keeper's questions${handIn.answers.length ? ", answered" : " (not answered yet)"}:`,
        ...handIn.questions.map((q) => {
          const ans = handIn.answers.find((x) => x.id === q.id);
          return `- ${q.asked}${ans ? `\n  "${ans.said}"${ans.pasted ? " (pasted)" : ""}, after ${Math.round((ans.ms ?? 0) / 1000)} s` : ""}`;
        }),
        "The whole hand-in is in the structured content.",
      ].join("\n");
      return say(text, { plot, module: only, who, counts: countsOf(handIn.record), handIn });
    }
    const rows: { plot: string; who: string; module: number; url: string; at: string; answered: boolean }[] = [];
    await Promise.all(
      PLOT_IDS.map(async (plot) => {
        const rec = await s.readPost(plot);
        await Promise.all(
          Object.entries(rec)
            .filter(([m]) => !only || Number(m) === only)
            .map(async ([m, v]) => {
              const parcel = currentParcel(plot, Number(m), v, await s.readHandIn(plot, Number(m)));
              rows.push({ plot, who: a[plot]?.label ?? "unassigned", module: Number(m), url: v.url, at: v.at, answered: parcel.answers.length > 0 });
            }),
        );
      }),
    );
    rows.sort((x, y) => x.module - y.module || x.plot.localeCompare(y.plot));
    const text = rows.length
      ? rows.map((r) => `module ${r.module} · ${r.plot} (${r.who}) · ${r.at.slice(0, 16).replace("T", " ")} · ${r.url} · ${r.answered ? "answered" : "not answered"}`).join("\n")
      : `Nothing posted${only ? ` for module ${only}` : ""} yet.`;
    return say(text, { rows });
  },
};

export const EXPO_TOOLS: McpTool[] = [expoMyArea, expoEdit, expoUndo, expoAssign, expoPost, expoMailroom];
