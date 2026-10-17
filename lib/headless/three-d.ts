/**
 * A 3D model made through Claude: a job of stages, each a Meshy task, kept in the generation's
 * parameters so it survives the functions it runs across.
 *
 *   mesh      one to four views, front first, become a textured model (3 to 8 minutes)
 *   rig       for a humanoid: a 24-joint skeleton (about 2 minutes)
 *   animate   an idle and a wave on that skeleton, in one file (about a minute)
 *   finish    the model is slimmed, its glow switched off (glb.ts), and copied into Sigil's
 *             outputs, since Meshy's links expire; its front view becomes the generation's picture
 *
 * A Meshy chain outruns the 300 seconds one function gets, so nothing waits for it in one
 * call: every collect (get_generation_status) moves the job on by what Meshy has finished, and
 * the call that starts a job keeps driving it for as long as its function lives. A lock on the
 * generation's status keeps two collects from starting the same stage twice. When the rig cannot
 * read the figure, the model is still delivered, unrigged, and the note says why.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadOutputBuffer, uploadProviderOutput } from "@/lib/supabase/storage";
import { getSafeFetchUrl } from "@/lib/security/url-safety";
import {
  IDLE_ACTION_ID,
  MeshyError,
  createAnimationTask,
  createRigTask,
  findActionId,
  getTask,
  type MeshyTask,
  type MeshyTaskKind,
} from "@/lib/models/meshy";
import { finishGlb, type FinishReport } from "./glb";

export type ThreeDStage = "mesh" | "rig" | "animate" | "finish" | "done";

export interface ThreeDState {
  stage: ThreeDStage;
  rig: boolean;
  name: string;
  meshTaskId: string;
  rigTaskId?: string;
  animTaskId?: string;
  /** The mesh as Meshy made it, kept in case the rig fails. */
  meshGlb?: string;
  riggedGlb?: string;
  /** The GLB the finish step takes. */
  sourceGlb?: string;
  thumbnail?: string;
  credits: number;
  stageStartedAt: string;
  progress: number;
  notes: string[];
  glbUrl?: string;
  report?: FinishReport;
}

/** How long each stage may take before the job is given up (Meshy's own times, doubled and more). */
export const STAGE_LIMIT_MS: Record<ThreeDStage, number> = {
  mesh: 20 * 60_000,
  rig: 10 * 60_000,
  animate: 10 * 60_000,
  finish: 5 * 60_000,
  done: Infinity,
};
/** A lock older than this was left by a function that died; the next collect takes it over. */
const LOCK_STALE_MS = 3 * 60_000;

export function newThreeDState(input: { meshTaskId: string; rig: boolean; name: string; now?: Date }): ThreeDState {
  return {
    stage: "mesh",
    rig: input.rig,
    name: input.name,
    meshTaskId: input.meshTaskId,
    credits: 0,
    stageStartedAt: (input.now ?? new Date()).toISOString(),
    progress: 0,
    notes: [],
  };
}

export type StepEffect =
  | { kind: "wait"; progress: number }
  | { kind: "create_rig" }
  | { kind: "create_animation" }
  | { kind: "finish" }
  | { kind: "fail"; message: string };

/**
 * Pure: what a stage's Meshy task says to do next, and how the state changes. The side effects
 * (creating the next task, finishing) are the caller's.
 */
export function decide(state: ThreeDState, task: MeshyTask, now: Date): { state: ThreeDState; effect: StepEffect } {
  const s: ThreeDState = { ...state, notes: [...state.notes] };
  const elapsed = now.getTime() - new Date(s.stageStartedAt).getTime();
  if (task.status === "PENDING" || task.status === "IN_PROGRESS") {
    if (elapsed > STAGE_LIMIT_MS[s.stage]) {
      return { state: s, effect: { kind: "fail", message: `Meshy took longer than Sigil waits for the ${s.stage} step.` } };
    }
    s.progress = task.progress;
    return { state: s, effect: { kind: "wait", progress: task.progress } };
  }
  const failed = task.status !== "SUCCEEDED" || !task.glbUrl;
  if (s.stage === "mesh") {
    if (failed) return { state: s, effect: { kind: "fail", message: `The model could not be made: ${task.error ?? task.status.toLowerCase()}.` } };
    s.credits += task.consumedCredits;
    s.meshGlb = task.glbUrl!;
    s.thumbnail = task.thumbnailUrl ?? undefined;
    if (s.rig) return { state: s, effect: { kind: "create_rig" } };
    s.sourceGlb = s.meshGlb;
    return { state: s, effect: { kind: "finish" } };
  }
  if (s.stage === "rig") {
    if (failed) {
      s.notes.push(`The rig could not read the figure as a standing humanoid (${task.error ?? "no reason given"}), so the model comes unrigged. An A-pose with the arms clear of the body, both feet visible, and no cape or long coat usually fixes it.`);
      s.sourceGlb = s.meshGlb;
      return { state: s, effect: { kind: "finish" } };
    }
    s.credits += task.consumedCredits;
    s.riggedGlb = task.glbUrl!;
    return { state: s, effect: { kind: "create_animation" } };
  }
  if (s.stage === "animate") {
    if (failed) {
      s.notes.push("The animations could not be made, so the model comes rigged without clips.");
      s.sourceGlb = s.riggedGlb;
    } else {
      s.credits += task.consumedCredits;
      s.sourceGlb = task.glbUrl!;
    }
    return { state: s, effect: { kind: "finish" } };
  }
  return { state: s, effect: { kind: "wait", progress: 100 } };
}

const KIND: Record<"mesh" | "rig" | "animate", MeshyTaskKind> = { mesh: "multi-image-to-3d", rig: "rigging", animate: "animations" };

function stateOf(parameters: unknown): ThreeDState | null {
  const p = parameters as Record<string, unknown> | null;
  const s = p?.threeD as ThreeDState | undefined;
  return s && typeof s.meshTaskId === "string" ? s : null;
}

export function isThreeD(parameters: unknown): boolean {
  return stateOf(parameters) !== null;
}

export function threeDStateOf(parameters: unknown): ThreeDState | null {
  return stateOf(parameters);
}

export type AdvanceResult =
  | { status: "processing"; state: ThreeDState }
  | { status: "busy" }
  | { status: "completed"; state: ThreeDState }
  | { status: "failed"; message: string };

async function lock(id: string, now: Date): Promise<boolean> {
  const taken = await prisma.generation.updateMany({
    where: { id, status: "processing" },
    data: { status: "processing_locked", lastHeartbeatAt: now },
  });
  if (taken.count > 0) return true;
  // A lock left behind by a function that died is taken over.
  const stolen = await prisma.generation.updateMany({
    where: { id, status: "processing_locked", OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: new Date(now.getTime() - LOCK_STALE_MS) } }] },
    data: { lastHeartbeatAt: now },
  });
  return stolen.count > 0;
}

async function save(id: string, parameters: Record<string, unknown>, state: ThreeDState, status: "processing" | "completed") {
  await prisma.generation.update({
    where: { id },
    data: { status, parameters: { ...parameters, threeD: state } as unknown as Prisma.InputJsonValue, lastHeartbeatAt: new Date() },
  });
}

async function fail(id: string, parameters: Record<string, unknown>, state: ThreeDState, message: string, retryable: boolean) {
  await prisma.generation.update({
    where: { id },
    data: {
      status: "failed",
      errorMessage: message,
      errorCategory: "provider",
      errorRetryable: retryable,
      parameters: { ...parameters, threeD: state } as unknown as Prisma.InputJsonValue,
    },
  });
}

/** Download Meshy's GLB, finish it, keep it in Sigil's outputs; the front view becomes the generation's picture. */
async function finish(gen: { id: string; userId: string }, state: ThreeDState): Promise<ThreeDState> {
  const src = getSafeFetchUrl(state.sourceGlb ?? "");
  if (!src) throw new MeshyError("Meshy's model link is not one Sigil fetches from.", null, false);
  const response = await fetch(src);
  if (!response.ok) throw new MeshyError(`Could not download the model: ${response.status}`, response.status, true);
  const { glb, report } = await finishGlb(Buffer.from(await response.arrayBuffer()));
  const glbUrl = await uploadOutputBuffer({
    userId: gen.userId,
    generationId: gen.id,
    name: `${state.rig && report.skinned ? "avatar" : "model"}.glb`,
    buffer: glb,
    contentType: "model/gltf-binary",
  });
  if (state.thumbnail) {
    try {
      const pictureUrl = await uploadProviderOutput({ sourceUrl: state.thumbnail, userId: gen.userId, generationId: gen.id, outputIndex: 0, fileType: "image" });
      await prisma.output.create({ data: { generationId: gen.id, fileUrl: pictureUrl, fileType: "image" } });
    } catch (err) {
      console.warn("[headless] 3d thumbnail not kept", err instanceof Error ? err.message : err);
    }
  }
  return { ...state, stage: "done", progress: 100, glbUrl, report };
}

/**
 * Move a 3D job on by whatever Meshy has finished: as many stages as are ready, in one call.
 * Returns where it stands. Safe to call from several places at once.
 */
export async function advanceThreeD(id: string, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<AdvanceResult> {
  const gen = await prisma.generation.findUnique({ where: { id }, select: { id: true, userId: true, status: true, parameters: true, errorMessage: true } });
  if (!gen) return { status: "failed", message: "No such model job." };
  let state = stateOf(gen.parameters);
  if (!state) return { status: "failed", message: "This is not a 3D model job." };
  if (gen.status === "failed") return { status: "failed", message: gen.errorMessage ?? "The model job failed." };
  if (gen.status === "completed") return { status: "completed", state };
  if (!(await lock(id, now))) return { status: "busy" };

  const parameters = (gen.parameters as Record<string, unknown>) ?? {};
  try {
    for (let step = 0; step < 4; step++) {
      if (state.stage === "finish") {
        state = await finish(gen, state);
        await save(id, parameters, state, "completed");
        return { status: "completed", state };
      }
      if (state.stage === "done") {
        await save(id, parameters, state, "completed");
        return { status: "completed", state };
      }
      const taskId = state.stage === "mesh" ? state.meshTaskId : state.stage === "rig" ? state.rigTaskId : state.animTaskId;
      if (!taskId) throw new MeshyError(`The ${state.stage} step has no task.`, null, false);
      const task = await getTask(env, KIND[state.stage], taskId);
      const { state: next, effect } = decide(state, task, now);
      state = next;
      if (effect.kind === "wait") {
        await save(id, parameters, state, "processing");
        return { status: "processing", state };
      }
      if (effect.kind === "fail") {
        await fail(id, parameters, state, effect.message, true);
        return { status: "failed", message: effect.message };
      }
      const started = new Date().toISOString();
      if (effect.kind === "create_rig") {
        try {
          state = { ...state, stage: "rig", rigTaskId: await createRigTask(env, state.meshTaskId), stageStartedAt: started, progress: 0 };
        } catch (err) {
          state = { ...state, stage: "finish", sourceGlb: state.meshGlb, notes: [...state.notes, `The rig could not start (${err instanceof Error ? err.message : "unknown error"}), so the model comes unrigged.`] };
        }
      } else if (effect.kind === "create_animation") {
        const wave = await findActionId(env, "wave");
        const actions = wave === null ? [IDLE_ACTION_ID] : [IDLE_ACTION_ID, wave];
        try {
          state = { ...state, stage: "animate", animTaskId: await createAnimationTask(env, state.rigTaskId!, actions), stageStartedAt: started, progress: 0 };
        } catch (err) {
          state = { ...state, stage: "finish", sourceGlb: state.riggedGlb, notes: [...state.notes, `The animations could not start (${err instanceof Error ? err.message : "unknown error"}), so the model comes rigged without clips.`] };
        }
      } else {
        state = { ...state, stage: "finish", stageStartedAt: started };
      }
    }
    await save(id, parameters, state, "processing");
    return { status: "processing", state };
  } catch (err) {
    const message = err instanceof Error ? err.message : "The model job failed.";
    const retryable = err instanceof MeshyError ? err.retryable : true;
    if (retryable) {
      // Meshy busy or a download hiccup: leave the job where it is for the next collect.
      await save(id, parameters, state, "processing");
      return { status: "processing", state };
    }
    await fail(id, parameters, state, message, false);
    return { status: "failed", message };
  }
}

/** Keep moving a job on for as long as a function lives (the call that started it hands its spare time over). */
export async function driveThreeD(id: string, env: NodeJS.ProcessEnv, budgetMs: number, intervalMs = 10_000): Promise<void> {
  const end = Date.now() + budgetMs;
  while (Date.now() + intervalMs < end) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const result = await advanceThreeD(id, env).catch(() => ({ status: "processing" }) as const);
    if (result.status === "completed" || result.status === "failed") return;
  }
}
