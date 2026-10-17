/**
 * The expo_* tools: a student looks at and changes their own area of Expo City by talking to
 * Claude; the teacher assigns the areas. See lib/headless/expo.ts for the document and its limits.
 * A student can only ever touch the plot assigned to their own Sigil account: the plot comes from
 * the signed-in principal, never from what the call says.
 */

import type { McpTool, ToolContext, ToolResult } from "./tools";
import {
  CATALOGUE,
  ExpoInputError,
  LIMITS,
  MONUMENTS,
  PLOT_IDS,
  VENUES,
  applyOps,
  emptyPlot,
  expoLink,
  expoStore,
  plotOf,
  saveVersion,
  type ExpoOp,
  type PlotDoc,
} from "./expo";

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

export const EXPO_TOOLS: McpTool[] = [expoMyArea, expoEdit, expoUndo, expoAssign];
