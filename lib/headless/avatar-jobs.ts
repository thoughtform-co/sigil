/**
 * The character creator's work on Sigil (lib/headless/avatar.ts says what and why): start a view's
 * draw, read a draw back (cutting it out of its ground once it is done), keep the four views as the
 * student's avatar, and, once Meshy is configured, make the 3D model from them. The routes under
 * app/api/expo/avatar call these with the student's own session; every id is checked to be that
 * student's own draw made for the creator, so an id is never a way into someone else's work.
 */

import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/models/registry";
import { processGeneration } from "@/lib/models/process-generation";
import { createMeshTask, hasMeshyKey, MESH_SETTINGS, MeshyError } from "@/lib/models/meshy";
import { checkAllowance, type AllowanceKind } from "./allowance";
import { avatarPrompt, avatarTagOf, AVATAR_VIEWS, cutOut, DrawBodySchema, KeepBodySchema, SIDE_VIEWS, type Avatar, type AvatarDrawTag, type AvatarView, type AvatarViews } from "./avatar";
import { expoStore, type ExpoStore } from "./expo";
import { advanceThreeD, driveThreeD, newThreeDState, threeDStateOf } from "./three-d";
import { createGeneration, DEFAULT_IMAGE_MODEL, failureText, isToolInputError, resolveReferences, STALE_MS } from "./tools";

/** How long the call that starts a 3D model keeps moving it on (its function has 300 seconds). */
const THREE_D_DRIVE_MS = 270_000;

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

function outputsPrefix(env: NodeJS.ProcessEnv): string | null {
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/outputs/` : null;
}

async function allowance(student: Student, kind: AllowanceKind, requested: number, env: NodeJS.ProcessEnv): Promise<Outcome<never> | null> {
  try {
    const d = await checkAllowance({ ownerId: student.id, isAdmin: student.isAdmin, kind, requested, env });
    return d.ok ? null : refuse(429, "allowance", d.message);
  } catch (err) {
    console.warn("[expo] avatar allowance check failed", err instanceof Error ? err.message : err);
    return refuse(503, "unavailable", "Sigil could not check your daily allowance just now, so nothing was drawn. Try again in a minute.");
  }
}

/** One view's draw: the recipe's prompt, square, the references first, from the model asked for or not at all. */
async function draw(student: Student, view: AvatarView, references: { urls: string[]; paths: string[] }, tag: AvatarDrawTag, note: string | undefined, ctx: RunContext): Promise<string> {
  const model = getModelConfig(DEFAULT_IMAGE_MODEL);
  if (!model) throw new Error(`no model ${DEFAULT_IMAGE_MODEL}`);
  const square = !model.supportedAspectRatios?.length || model.supportedAspectRatios.includes("1:1");
  const generation = await createGeneration({
    ownerId: student.id,
    type: "image",
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
  });
  ctx.waitUntil(processGeneration(generation).then((o) => {
    if (o.kind !== "completed") console.warn(`[expo] avatar ${view} draw ${generation.id.slice(0, 8)}: ${failureText(o)}`);
  }).catch(() => undefined));
  return generation.id;
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
    const refused = await allowance(student, "image", 1, ctx.env);
    if (refused) return refused;
    return { status: 202, body: { jobs: [{ view: "front", job: await draw(student, "front", refs, { view: "front" }, b.note, ctx) }] } };
  }

  if (b.step === "turn") {
    const front = await readDraw(student, b.front);
    if (!front || front.tag.view !== "front") return refuse(404, "no_front", "There is no front view of yours with that id.");
    const url = front.outputs.find((o) => o.fileType === "image")?.fileUrl;
    if (front.status !== "completed" || !url) return refuse(409, "not_ready", "The front view is not drawn yet.");
    const prefix = outputsPrefix(ctx.env);
    if (!prefix || !url.startsWith(prefix)) return refuse(409, "not_ready", "The front view is not where Sigil keeps its drawings.");
    const views = [...new Set(b.views ?? SIDE_VIEWS)];
    const refused = await allowance(student, "image", views.length, ctx.env);
    if (refused) return refused;
    const jobs: Job[] = [];
    // one change per view, each from the front as its only reference (avatar-recipe.md): never a view from a view
    for (const view of views) jobs.push({ view, job: await draw(student, view, { urls: [url], paths: [""] }, { view, front: front.id }, undefined, ctx) });
    return { status: 202, body: { jobs } };
  }

  if (!hasMeshyKey(ctx.env)) return refuse(503, "no_3d", "Sigil has no 3D model access configured yet. Tell your teacher.");
  const kept = await s.readAvatar(student.id);
  const sources = kept?.sources;
  if (!sources) return refuse(409, "no_views", "Keep your four views first; the 3D model is made from them.");
  const refused = await allowance(student, "3d", 1, ctx.env);
  if (refused) return refused;
  let meshTaskId: string;
  try {
    meshTaskId = await createMeshTask(ctx.env, AVATAR_VIEWS.map((v) => sources[v]));
  } catch (err) {
    const why = err instanceof MeshyError && err.status === 402 ? "Sigil's 3D credits have run out. Tell your teacher." : "The 3D model could not be started just now.";
    console.warn("[expo] avatar 3d failed to start", err instanceof Error ? err.message : err);
    return refuse(503, "no_3d", why);
  }
  const name = "Expo City avatar";
  const generation = await createGeneration({
    ownerId: student.id,
    type: "3d",
    modelId: MESH_SETTINGS.ai_model,
    prompt: name,
    parameters: { numOutputs: 1, viewPaths: [], threeD: newThreeDState({ meshTaskId, rig: true, name }), expoAvatar: { view: "glb" } satisfies AvatarDrawTag },
  });
  ctx.waitUntil(driveThreeD(generation.id, ctx.env, THREE_D_DRIVE_MS).catch(() => undefined));
  return { status: 202, body: { jobs: [{ view: "glb", job: generation.id }] } };
}

/** Cut a finished view out of its ground, once; the original stands in if the cut fails. */
async function cutoutOf(student: Student, d: NonNullable<Awaited<ReturnType<typeof readDraw>>>, url: string, env: NodeJS.ProcessEnv, s: ExpoStore): Promise<{ url: string; transparent: boolean }> {
  if (d.tag.cutout) return { url: d.tag.cutout, transparent: true };
  const prefix = outputsPrefix(env);
  try {
    // only Sigil's own outputs are fetched, so a stored URL can never point the server elsewhere
    if (!prefix || !url.startsWith(prefix)) throw new Error("not an output of Sigil's");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const png = await cutOut(Buffer.from(await res.arrayBuffer()));
    const cut = await s.writeCutout(student.id, d.id, png);
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
    if (!threeDStateOf(d.parameters)) return refuse(404, "no_job", "No draw of yours has that id.");
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
  if (!url) return { status: 200, body: { job: id, view, status: "failed", error: "The draw came back without a picture." } };
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
    if (st.stage !== "done" || !st.glbUrl) return refuse(409, "not_ready", "The 3D model is not finished yet.");
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
    if (d.status !== "completed" || !url) return refuse(409, "not_ready", `The ${view} view is not drawn yet.`);
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
