/**
 * The character creator's work on Sigil (lib/headless/avatar.ts says what and why): start a view's
 * draw, read a draw back (cutting it out of its ground once it is done), keep the four views as the
 * student's avatar, and, once Meshy is configured, make the 3D model from them. The routes under
 * app/api/expo/avatar call these with the student's own session; every id is checked to be that
 * student's own draw made for the creator, so an id is never a way into someone else's work.
 *
 * The allowance is reserved, not just checked: under a per-student advisory lock the used count is
 * read and the draws' rows are written in one transaction, and only then is a model called. Checking
 * first and writing after let a burst of requests all see the same count (the security review of
 * sigil#13); for a 3D model it billed Meshy before any row counted it.
 *
 * Only Sigil's own outputs are ever fetched, kept or handed on (to the game, or to Meshy).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/models/registry";
import { processGeneration } from "@/lib/models/process-generation";
import { createMeshTask, hasMeshyKey, MESH_SETTINGS, MeshyError } from "@/lib/models/meshy";
import { checkAllowance, type AllowanceKind } from "./allowance";
import { avatarPrompt, avatarTagOf, AVATAR_VIEWS, cutOut, DrawBodySchema, KeepBodySchema, SIDE_VIEWS, type Avatar, type AvatarDrawTag, type AvatarView, type AvatarViews } from "./avatar";
import { expoStore, type ExpoStore } from "./expo";
import { advanceThreeD, driveThreeD, newThreeDState, threeDStateOf } from "./three-d";
import { DEFAULT_IMAGE_MODEL, failureText, isToolInputError, resolveReferences, STALE_MS } from "./tools";
import { ensureClaudeSession } from "./workspace";

/** How long the call that starts a 3D model keeps moving it on (its function has 300 seconds). */
const THREE_D_DRIVE_MS = 270_000;
/** A view larger than this is not one of Sigil's drawings. */
const CUT_MAX_BYTES = 20 * 1024 * 1024;

export interface Student {
  id: string;
  isAdmin: boolean;
}
export interface RunContext {
  env: NodeJS.ProcessEnv;
  /** Keeps the function alive for the draw (`after` from next/server). */
  waitUntil: (p: Promise<unknown>) => void;
}

type Refusal = { error: string; code: string };
export type Outcome<T> = { status: 200 | 202; body: T } | { status: 400 | 403 | 404 | 409 | 429 | 503; body: Refusal };
const refuse = (status: 400 | 403 | 404 | 409 | 429 | 503, code: string, error: string): Outcome<never> => ({ status, body: { error, code } });

export interface Job {
  view: AvatarView | "glb";
  job: string;
}
export type JobState =
  | { job: string; view: AvatarView | "glb"; status: "processing"; stage?: string; progress?: number }
  | { job: string; view: AvatarView | "glb"; status: "completed"; url: string; transparent?: boolean }
  | { job: string; view: AvatarView | "glb"; status: "failed"; error: string };

/** Is this one of Sigil's own outputs (the public outputs bucket), and nothing that climbs out of it? */
export function isOutput(url: string | null | undefined, env: NodeJS.ProcessEnv): url is string {
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  // a climb out of the bucket in any spelling is refused before the URL parser can quietly resolve it
  if (!url || !base || /\.\.|%2e/i.test(url)) return false;
  try {
    const u = new URL(url);
    const prefix = new URL(`${base}/storage/v1/object/public/outputs/`);
    return u.origin === prefix.origin && u.pathname.startsWith(prefix.pathname) && !decodeURIComponent(u.pathname).includes("..") && !u.search && !u.hash;
  } catch {
    return false;
  }
}

interface RowSpec {
  modelId: string;
  prompt: string;
  parameters: Record<string, unknown>;
}
const ROW_SELECT = { id: true, sessionId: true, modelId: true, prompt: true, negativePrompt: true, parameters: true, userId: true } as const;
type Row = Prisma.GenerationGetPayload<{ select: typeof ROW_SELECT }>;

/**
 * Reserve the allowance and write the draws' rows in one go: one transaction under a per-student advisory
 * lock, so two requests at once are counted one after the other. A refusal writes nothing.
 */
export async function reserve(student: Student, kind: AllowanceKind, rows: RowSpec[], env: NodeJS.ProcessEnv): Promise<{ rows: Row[] } | { refused: Outcome<never> }> {
  const sessionId = await ensureClaudeSession(student.id, kind);
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`expo-allowance:${student.id}`}))`;
        const d = await checkAllowance({ ownerId: student.id, isAdmin: student.isAdmin, kind, requested: rows.reduce((n, r) => n + (Number(r.parameters.numOutputs) || 1), 0), env, db: tx });
        if (!d.ok) return { refused: refuse(429, "allowance", d.message) };
        const made: Row[] = [];
        for (const r of rows) {
          made.push(
            await tx.generation.create({
              data: { sessionId, userId: student.id, modelId: r.modelId, prompt: r.prompt, parameters: r.parameters as Prisma.InputJsonValue, status: "processing", source: "mcp" },
              select: ROW_SELECT,
            }),
          );
        }
        return { rows: made };
      },
      { timeout: 15_000 },
    );
  } catch (err) {
    console.warn("[expo] avatar reservation failed", err instanceof Error ? err.message : err);
    return { refused: refuse(503, "unavailable", "Sigil could not check your daily allowance just now, so nothing was drawn. Try again in a minute.") };
  }
}

/** One view's row: the recipe's prompt, square, the references first, from the model asked for or not at all. */
function viewRow(view: AvatarView, references: { urls: string[]; paths: string[] }, tag: AvatarDrawTag, note: string | undefined): RowSpec {
  const model = getModelConfig(DEFAULT_IMAGE_MODEL);
  if (!model) throw new Error(`no model ${DEFAULT_IMAGE_MODEL}`);
  const square = !model.supportedAspectRatios?.length || model.supportedAspectRatios.includes("1:1");
  return {
    modelId: model.id,
    prompt: avatarPrompt(view, note),
    parameters: {
      numOutputs: 1,
      allowFallback: false,
      referencesFirst: true,
      ...(square ? { aspectRatio: "1:1" } : {}),
      referenceImages: references.urls,
      referenceImagePaths: references.paths,
      referenceImageUrl: references.urls[0],
      expoAvatar: tag,
    },
  };
}

/** Run the reserved draws, after the answer. */
function run(rows: Row[], ctx: RunContext): void {
  for (const g of rows) {
    ctx.waitUntil(
      processGeneration(g)
        .then((o) => {
          if (o.kind !== "completed") console.warn(`[expo] avatar draw ${g.id.slice(0, 8)}: ${failureText(o)}`);
        })
        .catch(() => undefined),
    );
  }
}

async function readDraw(student: Student, id: string) {
  const g = await prisma.generation.findFirst({
    where: { id, userId: student.id, source: "mcp" },
    select: { id: true, status: true, errorMessage: true, createdAt: true, parameters: true, outputs: { orderBy: { createdAt: "asc" }, select: { fileUrl: true, fileType: true } } },
  });
  const tag = g ? avatarTagOf(g.parameters) : null;
  return g && tag ? { ...g, tag } : null;
}

/** Start a draw: the front from the student's pictures, the side views from a front, or the 3D model. */
export async function startAvatarDraw(student: Student, body: unknown, ctx: RunContext, s: ExpoStore = expoStore()): Promise<Outcome<{ jobs: Job[] }>> {
  const parsed = DrawBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return refuse(400, "invalid", `A draw is { step: "front", images, note? }, { step: "turn", front, views? } or { step: "3d" }${issue ? ` (${issue.path.join(".") || "body"}: ${issue.message})` : ""}.`);
  }
  const b = parsed.data;
  if (b.step === "front") {
    let refs: { urls: string[]; paths: string[] };
    try {
      refs = await resolveReferences(b.images, student.id, ctx.env);
    } catch (err) {
      if (isToolInputError(err)) return refuse(400, "images", "The pictures must be the ones you uploaded for this character.");
      throw err;
    }
    const r = await reserve(student, "image", [viewRow("front", refs, { view: "front" }, b.note)], ctx.env);
    if ("refused" in r) return r.refused;
    run(r.rows, ctx);
    return { status: 202, body: { jobs: [{ view: "front", job: r.rows[0]!.id }] } };
  }

  if (b.step === "turn") {
    const front = await readDraw(student, b.front);
    if (!front || front.tag.view !== "front") return refuse(404, "no_front", "There is no front view of yours with that id.");
    const url = front.outputs.find((o) => o.fileType === "image")?.fileUrl;
    if (front.status !== "completed" || !url) return refuse(409, "not_ready", "The front view is not drawn yet.");
    if (!isOutput(url, ctx.env)) return refuse(409, "not_ready", "The front view is not where Sigil keeps its drawings.");
    const views = [...new Set(b.views ?? SIDE_VIEWS)];
    // one change per view, each from the front as its only reference (avatar-recipe.md): never a view from a view
    const r = await reserve(student, "image", views.map((view) => viewRow(view, { urls: [url], paths: [""] }, { view, front: front.id }, undefined)), ctx.env);
    if ("refused" in r) return r.refused;
    run(r.rows, ctx);
    return { status: 202, body: { jobs: r.rows.map((g, i) => ({ view: views[i]!, job: g.id })) } };
  }

  if (!hasMeshyKey(ctx.env)) return refuse(503, "no_3d", "Sigil has no 3D model access configured yet. Tell your teacher.");
  const kept = await s.readAvatar(student.id);
  const sources = kept?.sources;
  if (!sources || !AVATAR_VIEWS.every((v) => isOutput(sources[v], ctx.env))) return refuse(409, "no_views", "Keep your four views first; the 3D model is made from them.");
  const name = "Expo City avatar";
  // the row first, so the model counts before Meshy is asked; a model that cannot start fails its row
  const r = await reserve(student, "3d", [{ modelId: MESH_SETTINGS.ai_model, prompt: name, parameters: { numOutputs: 1, viewPaths: [], expoAvatar: { view: "glb" } satisfies AvatarDrawTag } }], ctx.env);
  if ("refused" in r) return r.refused;
  const row = r.rows[0]!;
  let meshTaskId: string;
  try {
    meshTaskId = await createMeshTask(ctx.env, AVATAR_VIEWS.map((v) => sources[v]));
  } catch (err) {
    const why = err instanceof MeshyError && err.status === 402 ? "Sigil's 3D credits have run out. Tell your teacher." : "The 3D model could not be started just now.";
    console.warn("[expo] avatar 3d failed to start", err instanceof Error ? err.message : err);
    await prisma.generation.update({ where: { id: row.id }, data: { status: "failed", errorMessage: why } }).catch(() => undefined);
    return refuse(503, "no_3d", why);
  }
  await prisma.generation.update({ where: { id: row.id }, data: { parameters: { ...(row.parameters as Record<string, unknown>), threeD: newThreeDState({ meshTaskId, rig: true, name }) } as unknown as Prisma.InputJsonValue } });
  ctx.waitUntil(driveThreeD(row.id, ctx.env, THREE_D_DRIVE_MS).catch(() => undefined));
  return { status: 202, body: { jobs: [{ view: "glb", job: row.id }] } };
}

/** Cut a finished view out of its ground, once; the original (one of Sigil's outputs) stands in if the cut fails. */
async function cutoutOf(student: Student, d: NonNullable<Awaited<ReturnType<typeof readDraw>>>, url: string, env: NodeJS.ProcessEnv, s: ExpoStore): Promise<{ url: string; transparent: boolean }> {
  if (isOutput(d.tag.cutout, env)) return { url: d.tag.cutout, transparent: true };
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "manual" });
    if (res.status !== 200) throw new Error(`fetch ${res.status}`);
    if (Number(res.headers.get("content-length") ?? 0) > CUT_MAX_BYTES) throw new Error("too large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > CUT_MAX_BYTES) throw new Error("too large");
    const cut = await s.writeCutout(student.id, d.id, await cutOut(buf));
    await prisma.generation.update({ where: { id: d.id }, data: { parameters: { ...(d.parameters as Record<string, unknown>), expoAvatar: { ...d.tag, cutout: cut } } } });
    return { url: cut, transparent: true };
  } catch (err) {
    console.warn(`[expo] avatar cut-out of ${d.id.slice(0, 8)} failed`, err instanceof Error ? err.message : err);
    return { url, transparent: false };
  }
}

/** Where a draw stands; a finished view comes back cut out, transparent. */
export async function avatarJob(student: Student, id: string, env: NodeJS.ProcessEnv, s: ExpoStore = expoStore(), now: Date = new Date()): Promise<Outcome<JobState>> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return refuse(404, "no_job", "No draw of yours has that id.");
  const d = await readDraw(student, id);
  if (!d) return refuse(404, "no_job", "No draw of yours has that id.");
  const view = d.tag.view;
  if (d.status === "failed") return { status: 200, body: { job: id, view, status: "failed", error: d.errorMessage ?? "The draw failed." } };

  if (view === "glb") {
    // a model whose Meshy task is still being started has no state yet
    if (!threeDStateOf(d.parameters)) return { status: 200, body: { job: id, view, status: "processing", stage: "mesh", progress: 0 } };
    const r = await advanceThreeD(id, env, now);
    if (r.status === "failed") return { status: 200, body: { job: id, view, status: "failed", error: r.message } };
    if (r.status === "completed") return { status: 200, body: { job: id, view, status: "completed", url: r.state.glbUrl! } };
    const st = r.status === "processing" ? r.state : threeDStateOf(d.parameters)!;
    return { status: 200, body: { job: id, view, status: "processing", stage: st.stage, progress: st.progress } };
  }

  if (d.status !== "completed") {
    if (now.getTime() - d.createdAt.getTime() > STALE_MS) {
      await prisma.generation.updateMany({
        where: { id, status: { in: ["processing", "processing_locked"] } },
        data: { status: "failed", errorMessage: "The model took longer than Sigil waits for a result.", errorCategory: "timeout", errorRetryable: true },
      });
      return { status: 200, body: { job: id, view, status: "failed", error: "The draw took too long and was stopped. Draw it again." } };
    }
    return { status: 200, body: { job: id, view, status: "processing" } };
  }
  const url = d.outputs.find((o) => o.fileType === "image")?.fileUrl;
  if (!isOutput(url, env)) return { status: 200, body: { job: id, view, status: "failed", error: "The draw came back without a picture Sigil keeps. Draw it again." } };
  const cut = await cutoutOf(student, d, url, env, s);
  return { status: 200, body: { job: id, view, status: "completed", url: cut.url, transparent: cut.transparent } };
}

/** Keep the four views (or a finished 3D model) as the student's avatar. */
export async function keepAvatar(student: Student, body: unknown, env: NodeJS.ProcessEnv, s: ExpoStore = expoStore(), now: Date = new Date()): Promise<Outcome<{ ok: true; avatar: Avatar }>> {
  const parsed = KeepBodySchema.safeParse(body);
  if (!parsed.success) return refuse(400, "invalid", "Keep { front, right, back, left } (the four draws), or { glb } (a finished 3D model).");
  const b = parsed.data;
  const kept = await s.readAvatar(student.id);

  if ("glb" in b) {
    const d = await readDraw(student, b.glb);
    const st = d && d.tag.view === "glb" ? threeDStateOf(d.parameters) : null;
    if (!st) return refuse(404, "no_job", "No 3D model of yours has that id.");
    if (st.stage !== "done" || !isOutput(st.glbUrl, env)) return refuse(409, "not_ready", "The 3D model is not finished yet.");
    const a = kept?.avatar;
    const views = a?.kind === "views" ? { front: a.front, right: a.right, back: a.back, left: a.left } : a?.kind === "glb" ? a.views : undefined;
    const avatar: Avatar = { kind: "glb", src: st.glbUrl, ...(views ? { views } : {}) };
    await s.writeAvatar(student.id, { ...kept, avatar, keptAt: now.toISOString() });
    return { status: 200, body: { ok: true, avatar } };
  }

  const ids = AVATAR_VIEWS.map((v) => b[v]);
  if (new Set(ids).size !== 4) return refuse(400, "invalid", "Four different draws, one per view.");
  const draws = await Promise.all(ids.map((id) => readDraw(student, id)));
  const views = {} as AvatarViews;
  const sources = {} as AvatarViews;
  for (const [i, view] of AVATAR_VIEWS.entries()) {
    const d = draws[i];
    if (!d || d.tag.view !== view) return refuse(404, "no_job", `No ${view} view of yours has that id.`);
    // the side views must be drawn from this front, or the four are not one character
    if (view !== "front" && d.tag.front !== b.front) return refuse(400, "not_one", `The ${view} view was drawn from another front.`);
    const url = d.outputs.find((o) => o.fileType === "image")?.fileUrl;
    if (d.status !== "completed" || !isOutput(url, env)) return refuse(409, "not_ready", `The ${view} view is not drawn yet.`);
    views[view] = (await cutoutOf(student, d, url, env, s)).url;
    sources[view] = url;
  }
  const avatar: Avatar = { kind: "views", ...views };
  await s.writeAvatar(student.id, { avatar, sources, jobs: Object.fromEntries(AVATAR_VIEWS.map((v, i) => [v, ids[i]])), keptAt: now.toISOString() });
  return { status: 200, body: { ok: true, avatar } };
}

/** The signed-in person as the creator treats them: admins are not held to the allowance. */
export async function studentOf(user: { id: string }): Promise<Student> {
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } });
  return { id: user.id, isAdmin: profile?.role === "admin" };
}
