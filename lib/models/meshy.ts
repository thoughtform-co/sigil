/**
 * Meshy, Sigil's 3D model access: a character or an object from one to four views, and for a
 * humanoid a rig and a few animations. Only the headless 3D job (lib/headless/three-d.ts) calls
 * it; the key is read from MESHY_API_KEY in Sigil's environment and never leaves it.
 *
 * The settings are the ones measured on the voidwalker avatar and the gradient descent (Meshy's
 * docs: https://docs.meshy.ai/en/api): the front view first (it is the model's front, and the
 * rig needs the face toward +Z), an A-pose so the arms come free of the torso, lighting removed
 * from the texture, a 30k-triangle remesh, a 2k texture without PBR maps. Every task is
 * asynchronous: create it, keep its id, ask for it again until it has succeeded or failed.
 */

const BASE = "https://api.meshy.ai/openapi/v1";

export type MeshyTaskKind = "multi-image-to-3d" | "rigging" | "animations";

export interface MeshyTask {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress: number;
  consumedCredits: number;
  /** The model as Meshy made it: the mesh's GLB, or the rigged or animated character's. */
  glbUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
}

export class MeshyError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** The mesh request: everything but the views, which come first and front first. */
export const MESH_SETTINGS = {
  ai_model: "meshy-7.1",
  should_texture: true,
  enable_pbr: false,
  texture_resolution: "2k",
  image_enhancement: false,
  remove_lighting: true,
  should_remesh: true,
  target_polycount: 30000,
  topology: "triangle",
  pose_mode: "a-pose",
  target_formats: ["glb"],
  multi_view_thumbnails: true,
  moderation: true,
} as const;

/** A character's height for the rig, in metres. */
export const RIG_HEIGHT_METERS = 1.75;
/** Long_Breathe_and_Look_Around: the idle that suits a character standing in a room (measured on the voidwalker rig). */
export const IDLE_ACTION_ID = 336;

export function hasMeshyKey(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.MESHY_API_KEY?.trim());
}

async function call(env: NodeJS.ProcessEnv, method: "GET" | "POST", path: string, body?: unknown): Promise<Record<string, unknown>> {
  const key = env.MESHY_API_KEY?.trim();
  if (!key) throw new MeshyError("Sigil has no 3D model access configured.", null, false);
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    const reason = typeof json.message === "string" ? json.message : text.slice(0, 200) || response.statusText;
    // 402 is out of credits, 422 a figure the rig cannot read, 429 too many at once; only the last is worth retrying.
    throw new MeshyError(`Meshy ${response.status}: ${reason}`, response.status, response.status === 429 || response.status >= 500);
  }
  return json;
}

function taskId(json: Record<string, unknown>): string {
  const id = json.result;
  if (typeof id !== "string" || !id) throw new MeshyError("Meshy did not return a task id.", null, true);
  return id;
}

export async function createMeshTask(env: NodeJS.ProcessEnv, imageUrls: string[]): Promise<string> {
  if (imageUrls.length < 1 || imageUrls.length > 4) throw new MeshyError("A model takes one to four views.", null, false);
  return taskId(await call(env, "POST", "/multi-image-to-3d", { image_urls: imageUrls, ...MESH_SETTINGS }));
}

export async function createRigTask(env: NodeJS.ProcessEnv, meshTaskId: string): Promise<string> {
  return taskId(await call(env, "POST", "/rigging", { input_task_id: meshTaskId, height_meters: RIG_HEIGHT_METERS }));
}

export async function createAnimationTask(env: NodeJS.ProcessEnv, rigTaskId: string, actionIds: number[]): Promise<string> {
  // action_id is an integer: a string is a 400 that reads like a bad action, not a bad type.
  const ids = [...new Set(actionIds.map((n) => Math.trunc(n)))].slice(0, 10);
  return taskId(await call(env, "POST", "/animations", { rig_task_id: rigTaskId, action_ids: ids }));
}

/** One task's state, whatever its kind, read into the fields the job needs. */
export async function getTask(env: NodeJS.ProcessEnv, kind: MeshyTaskKind, id: string): Promise<MeshyTask> {
  const json = await call(env, "GET", `/${kind}/${encodeURIComponent(id)}`);
  const result = (json.result as Record<string, unknown> | undefined) ?? {};
  const modelUrls = (json.model_urls as Record<string, unknown> | undefined) ?? {};
  const err = json.task_error as Record<string, unknown> | undefined;
  const glb =
    kind === "multi-image-to-3d"
      ? modelUrls.glb
      : kind === "rigging"
        ? result.rigged_character_glb_url
        : result.animation_glb_url;
  return {
    id,
    status: (json.status as MeshyTask["status"]) ?? "PENDING",
    progress: Number(json.progress) || 0,
    consumedCredits: Number(json.consumed_credits) || 0,
    glbUrl: typeof glb === "string" ? glb : null,
    thumbnailUrl: typeof json.thumbnail_url === "string" ? json.thumbnail_url : null,
    error: err && typeof err.message === "string" && err.message ? err.message : null,
  };
}

const actionCache = new Map<string, number | null>();

/**
 * An animation's id in Meshy's library by a word in its name ("wave"), looked up once per
 * server instance; listing the library costs nothing. Null when nothing matches.
 */
export async function findActionId(env: NodeJS.ProcessEnv, search: string): Promise<number | null> {
  if (actionCache.has(search)) return actionCache.get(search) ?? null;
  try {
    const json = await call(env, "GET", `/animations/library?search=${encodeURIComponent(search)}&page_size=20`);
    const list = (Array.isArray(json.result) ? json.result : Array.isArray(json) ? json : []) as Array<Record<string, unknown>>;
    const hit = list.find((a) => typeof a.action_id === "number" && String(a.name ?? "").toLowerCase().includes(search.toLowerCase()));
    const id = hit ? (hit.action_id as number) : null;
    actionCache.set(search, id);
    return id;
  } catch {
    return null;
  }
}
