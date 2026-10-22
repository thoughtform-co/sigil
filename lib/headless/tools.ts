/**
 * The tools of the Sigil MCP server.
 *
 * Every draw runs with the provider keys in Sigil's own environment. A caller holds a sign-in
 * token for Sigil and nothing else: no tool returns, accepts or echoes a provider key.
 */

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAllModels, getModelConfig } from "@/lib/models/registry";
import { routeModel } from "@/lib/models/routing";
import { processGeneration, type ProcessOutcome } from "@/lib/models/process-generation";
import { createAdminClient } from "@/lib/supabase/admin";
import { REFERENCES_BUCKET } from "@/lib/supabase/storage";
import { createReferenceSignedUrl } from "@/lib/reference-images";
import { checkAllowance, type AllowanceKind } from "./allowance";
import type { HeadlessPrincipal } from "./auth";
import { makeImagePreview } from "./preview";
import { ensureClaudeSession } from "./workspace";
import { createMeshTask, hasMeshyKey, MESH_SETTINGS, MeshyError } from "@/lib/models/meshy";
import { advanceThreeD, driveThreeD, newThreeDState, threeDStateOf, type ThreeDState } from "./three-d";
import { EXPO_TOOLS } from "./expo-tools";
import { ExpoInputError } from "./expo";

export const DEFAULT_IMAGE_MODEL = "gemini-nano-banana-pro";
export const DEFAULT_VIDEO_MODEL = "veo-3.1";
/** Models that exist only as a fallback route, never something to ask for. */
const HIDDEN_MODELS = new Set(["nano-banana-backup"]);
const MAX_IMAGES_PER_CALL = 4;
const MAX_REFERENCES = 8;
const MAX_UPLOADS_PER_CALL = 8;
const MAX_VIEWS = 4;
/** How long the call that starts a 3D job keeps moving it on (its function has 300 seconds). */
const THREE_D_DRIVE_MS = 270_000;
/**
 * A draw through Claude comes from the model that was asked for, or it fails and says so. The
 * web app's quiet switch to a backup model would put pictures from another model in a student's
 * batch without anyone knowing.
 */
const STRICT = { allowFallback: false } as const;
/**
 * A draw still "processing" after this long was cut off with its function (300 seconds) and
 * will never finish: say so, and stop it counting against the allowance.
 */
const STALE_AFTER_MS = 8 * 60 * 1000;
/** A draw still processing after this long never finishes (the avatar routes use it too). */
export const STALE_MS = STALE_AFTER_MS;
/** How long an image call waits before handing back an id to collect later. */
export const INLINE_WAIT_MS = 50_000;

type Content =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface ToolResult {
  content: Content[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  /** Logged, never sent. */
  costUsd?: number | null;
  modelId?: string | null;
}

export interface ToolContext {
  principal: HeadlessPrincipal;
  /** Keeps the function alive for work that outlives the response (`after` from next/server). */
  waitUntil: (promise: Promise<unknown>) => void;
  env: NodeJS.ProcessEnv;
  inlineWaitMs?: number;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean };
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

class ToolInputError extends Error {}

function text(value: string): Content {
  return { type: "text", text: value };
}

function refusal(message: string): ToolResult {
  return { isError: true, content: [text(message)] };
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function visibleModels(type?: "image" | "video") {
  return getAllModels().filter((m) => !HIDDEN_MODELS.has(m.id) && (!type || m.type === type));
}

function pickModel(args: Record<string, unknown>, type: "image" | "video") {
  const id = str(args, "model") ?? (type === "image" ? DEFAULT_IMAGE_MODEL : DEFAULT_VIDEO_MODEL);
  const config = HIDDEN_MODELS.has(id) ? null : getModelConfig(id);
  if (!config || config.type !== type) {
    const known = visibleModels(type).map((m) => m.id).join(", ");
    throw new ToolInputError(`Unknown ${type} model "${id}". Use one of: ${known}.`);
  }
  return config;
}

function pickAspectRatio(args: Record<string, unknown>, supported: string[] | undefined): string | undefined {
  const ratio = str(args, "aspectRatio");
  if (!ratio) return undefined;
  if (supported && supported.length > 0 && !supported.includes(ratio)) {
    throw new ToolInputError(`Aspect ratio "${ratio}" is not supported by this model. Use one of: ${supported.join(", ")}.`);
  }
  return ratio;
}

function outputsPrefix(env: NodeJS.ProcessEnv): string | null {
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/outputs/` : null;
}

/**
 * References are either files the caller uploaded through `create_upload_urls` (a path inside
 * their own folder of the references bucket) or something Sigil drew earlier (a URL in the
 * outputs bucket). Nothing else is fetched, so a reference can never point the server elsewhere.
 */
export async function resolveReferences(
  value: unknown,
  ownerId: string,
  env: NodeJS.ProcessEnv,
): Promise<{ urls: string[]; paths: string[] }> {
  if (value === undefined || value === null) return { urls: [], paths: [] };
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ToolInputError("`references` must be a list of strings.");
  }
  if (value.length > MAX_REFERENCES) {
    throw new ToolInputError(`At most ${MAX_REFERENCES} references per call.`);
  }
  const prefix = outputsPrefix(env);
  const urls: string[] = [];
  const paths: string[] = [];
  for (const raw of value as string[]) {
    const ref = raw.trim();
    if (ref.startsWith(`references/${ownerId}/`) && !ref.includes("..")) {
      urls.push(await createReferenceSignedUrl(ref));
      paths.push(ref);
    } else if (prefix && ref.startsWith(prefix) && !ref.includes("..")) {
      urls.push(ref);
      paths.push("");
    } else {
      throw new ToolInputError(
        `Reference not recognised: "${ref.slice(0, 120)}". Pass a \`ref\` from create_upload_urls, or the URL of an image Sigil drew.`,
      );
    }
  }
  return { urls, paths };
}

export async function createGeneration(input: {
  ownerId: string;
  type: "image" | "video" | "3d";
  modelId: string;
  prompt: string;
  parameters: Record<string, unknown>;
}) {
  const sessionId = await ensureClaudeSession(input.ownerId, input.type);
  return prisma.generation.create({
    data: {
      sessionId,
      userId: input.ownerId,
      modelId: input.modelId,
      prompt: input.prompt,
      parameters: input.parameters as Prisma.InputJsonValue,
      status: "processing",
      source: "mcp",
    },
    select: { id: true, sessionId: true, modelId: true, prompt: true, negativePrompt: true, parameters: true, userId: true },
  });
}

export function failureText(outcome: Exclude<ProcessOutcome, { kind: "completed" }>): string {
  switch (outcome.kind) {
    case "claimed":
      return "This draw is already running.";
    case "unknown_model":
      return `Sigil has no adapter for model "${outcome.modelId}".`;
    case "ephemeral_references":
      return outcome.message;
    case "adapter_failed":
      return `The model did not return a result: ${outcome.error}`;
    case "error":
      return `The draw failed: ${outcome.message}`;
  }
}

interface FinishedOutput {
  url: string;
  fileType: string;
  width: number | null;
  height: number | null;
  duration?: number | null;
}

/** What Claude gets for finished outputs: the lines to put in its reply, and previews it can read. */
async function describeOutputs(input: {
  generationId: string;
  modelId: string;
  outputs: FinishedOutput[];
  previews: boolean;
}): Promise<ToolResult> {
  const { generationId, modelId, outputs } = input;
  const short = generationId.slice(0, 8);
  const images = outputs.filter((o) => o.fileType === "image");
  const videos = outputs.filter((o) => o.fileType === "video");
  const lines: string[] = [];

  if (images.length > 0) {
    lines.push(
      `Drew ${images.length} image${images.length === 1 ? "" : "s"} with ${modelId} (draw ${short}).`,
      "Show them by putting these lines in your reply, exactly as they are, one per picture:",
      ...images.map((o, i) => `![Image ${i + 1} from ${modelId}](${o.url})`),
      "Where a folder is connected (Cowork, Claude Code), also download each URL into it. Sigil cannot write to a disk, you do. Full-resolution files, in order:",
      ...images.map((o, i) => `${i + 1}. ${o.url}${o.width && o.height ? ` (${o.width}x${o.height})` : ""}`),
    );
  }
  if (videos.length > 0) {
    lines.push(
      `Made ${videos.length} video${videos.length === 1 ? "" : "s"} with ${modelId} (draw ${short}).`,
      "Give the person these links; where a folder is connected, download each file into it:",
      ...videos.map((o, i) => `${i + 1}. ${o.url}${o.duration ? ` (${o.duration}s)` : ""}`),
    );
  }

  const content: Content[] = [text(lines.join("\n"))];
  if (input.previews && images.length > 0) {
    const previews = await Promise.all(images.map((o) => makeImagePreview(o.url)));
    content.push(text("The pictures below are JPEG previews for reading (long edge at most 1280 px); the links above are the originals."));
    previews.forEach((preview, i) => {
      content.push(preview ? { type: "image", ...preview } : text(`No preview for image ${i + 1}; use its link.`));
    });
  }
  return {
    content,
    structuredContent: {
      generationId,
      status: "completed",
      modelId,
      outputs: outputs.map((o) => ({
        url: o.url,
        type: o.fileType,
        width: o.width,
        height: o.height,
        ...(o.duration ? { duration: o.duration } : {}),
      })),
    },
  };
}

async function allowanceRefusal(
  ctx: ToolContext,
  kind: AllowanceKind,
  requested: number,
): Promise<ToolResult | null> {
  try {
    const decision = await checkAllowance({
      ownerId: ctx.principal.ownerId,
      isAdmin: ctx.principal.ownerRole === "admin",
      kind,
      requested,
      env: ctx.env,
    });
    return decision.ok ? null : refusal(decision.message);
  } catch (err) {
    console.warn("[headless] allowance check failed", err instanceof Error ? err.message : err);
    return refusal("Sigil could not check your daily allowance just now, so nothing was drawn. Try again in a minute.");
  }
}

const listModels: McpTool = {
  name: "list_models",
  title: "List models",
  description: "The image and video models Sigil can draw with, with the aspect ratios each one takes.",
  inputSchema: {
    type: "object",
    properties: { type: { type: "string", enum: ["image", "video"], description: "Only models of this kind." } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async run(args) {
    const type = args.type === "image" || args.type === "video" ? args.type : undefined;
    const models = visibleModels(type).map((m) => {
      const routed = routeModel(m.id);
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        description: m.description,
        aspectRatios: m.supportedAspectRatios ?? [],
        maxReferenceImages: m.capabilities?.maxReferenceImages ?? (m.type === "image" ? 1 : 0),
        default: m.id === DEFAULT_IMAGE_MODEL || m.id === DEFAULT_VIDEO_MODEL,
        ...(routed.routed ? { servedBy: routed.modelId } : {}),
      };
    });
    const summary = models
      .map((m) => `${m.id} (${m.type}${m.default ? ", default" : ""}): ${m.name}. Aspect ratios: ${m.aspectRatios.join(", ") || "model default"}.`)
      .join("\n");
    return { content: [text(summary)], structuredContent: { models } };
  },
};

const UPLOAD_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * One signed upload URL per file, into the person's own folder of the references bucket; its `ref`
 * is what a draw takes. Shared by create_upload_urls and Expo City's character creator.
 */
export async function createReferenceUploads(ownerId: string, files: { mimeType: string; name?: string | null }[]) {
  const admin = createAdminClient();
  const uploads: { name: string | null; mimeType: string; ref: string; uploadUrl: string }[] = [];
  for (const file of files) {
    const ext = UPLOAD_EXTENSIONS[file.mimeType];
    if (!ext) throw new ToolInputError("Each file needs a mimeType of image/jpeg, image/png or image/webp.");
    const path = `references/${ownerId}/mcp-${randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from(REFERENCES_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      throw new Error(`Could not prepare an upload: ${error?.message ?? "unknown error"}`);
    }
    uploads.push({ name: file.name ? file.name.slice(0, 200) : null, mimeType: file.mimeType, ref: path, uploadUrl: data.signedUrl });
  }
  return uploads;
}

const createUploadUrls: McpTool = {
  name: "create_upload_urls",
  title: "Upload reference images",
  description:
    "Get one upload URL per reference image (a photograph, a sketch, an earlier picture on disk). Send each file with `curl -X PUT -H \"Content-Type: <mimeType>\" --data-binary @<file> \"<uploadUrl>\"`, then pass its `ref` in `references` of generate_image or as `startImage` of generate_video. Needs a place where files can be read and sent (Cowork, Claude Code); an upload URL works once and for two hours.",
  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        minItems: 1,
        maxItems: MAX_UPLOADS_PER_CALL,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The file's name, for your own bookkeeping." },
            mimeType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] },
          },
          required: ["mimeType"],
          additionalProperties: false,
        },
      },
    },
    required: ["files"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  async run(args, ctx) {
    const files = Array.isArray(args.files) ? args.files : [];
    if (files.length === 0 || files.length > MAX_UPLOADS_PER_CALL) {
      throw new ToolInputError(`Pass between 1 and ${MAX_UPLOADS_PER_CALL} files.`);
    }
    const uploads = await createReferenceUploads(
      ctx.principal.ownerId,
      (files as Array<Record<string, unknown>>).map((file) => ({ mimeType: typeof file?.mimeType === "string" ? file.mimeType : "", name: typeof file?.name === "string" ? file.name : null })),
    );
    const lines = uploads.map(
      (u, i) => `${i + 1}. ${u.name ?? "file"}: PUT to ${u.uploadUrl} with Content-Type ${u.mimeType}; then use ref ${u.ref}`,
    );
    return { content: [text(lines.join("\n"))], structuredContent: { uploads } };
  },
};

const generateImage: McpTool = {
  name: "generate_image",
  title: "Draw images",
  description:
    `Draw one to ${MAX_IMAGES_PER_CALL} images from a prompt, with Sigil's own model access (no API key is needed or accepted). Answers within about a minute with links to the files and previews you can read; a slower draw returns a generationId to collect with get_generation_status. For a larger batch, call it again; each call counts against the person's daily allowance.`,
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "What to draw, in full. Sent to the model as it is." },
      model: { type: "string", description: `A model id from list_models. Default: ${DEFAULT_IMAGE_MODEL}.` },
      count: { type: "integer", minimum: 1, maximum: MAX_IMAGES_PER_CALL, description: "How many images. Default 1." },
      aspectRatio: { type: "string", description: "For example 1:1, 16:9, 9:16, 4:5. See list_models for what a model takes." },
      references: {
        type: "array",
        maxItems: MAX_REFERENCES,
        items: { type: "string" },
        description: "Reference images, in order: a `ref` from create_upload_urls, or the URL of an image Sigil drew earlier.",
      },
      previews: { type: "boolean", description: "Send a small copy of each image back to look at. Default true." },
    },
    required: ["prompt"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  async run(args, ctx) {
    const prompt = str(args, "prompt");
    if (!prompt) throw new ToolInputError("`prompt` is required.");
    if (prompt.length > 50_000) throw new ToolInputError("The prompt is longer than 50,000 characters.");
    const model = pickModel(args, "image");
    const count = args.count === undefined ? 1 : Number(args.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_IMAGES_PER_CALL) {
      throw new ToolInputError(`\`count\` must be a whole number from 1 to ${MAX_IMAGES_PER_CALL}.`);
    }
    const aspectRatio = pickAspectRatio(args, model.supportedAspectRatios);
    const references = await resolveReferences(args.references, ctx.principal.ownerId, ctx.env);

    const refused = await allowanceRefusal(ctx, "image", count);
    if (refused) return { ...refused, modelId: model.id };

    const generation = await createGeneration({
      ownerId: ctx.principal.ownerId,
      type: "image",
      modelId: model.id,
      prompt,
      parameters: {
        numOutputs: count,
        ...STRICT,
        referencesFirst: true,
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(references.urls.length > 0
          ? { referenceImages: references.urls, referenceImagePaths: references.paths, referenceImageUrl: references.urls[0] }
          : {}),
      },
    });

    const work = processGeneration(generation);
    ctx.waitUntil(work.catch(() => undefined));
    const waitMs = ctx.inlineWaitMs ?? INLINE_WAIT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), waitMs);
      }),
    ]);
    if (timer) clearTimeout(timer);

    if (outcome === null) {
      return {
        modelId: model.id,
        content: [
          text(
            `Still drawing (draw ${generation.id.slice(0, 8)}). Call get_generation_status with generationId ${generation.id} in about 20 seconds; do not draw it again.`,
          ),
        ],
        structuredContent: { generationId: generation.id, status: "processing", modelId: model.id },
      };
    }
    if (outcome.kind !== "completed") {
      return { ...refusal(failureText(outcome)), modelId: model.id };
    }
    const described = await describeOutputs({
      generationId: generation.id,
      modelId: outcome.modelId,
      outputs: outcome.outputs.map((o) => ({ ...o, duration: o.duration ?? null })),
      previews: args.previews !== false,
    });
    return { ...described, costUsd: outcome.cost, modelId: outcome.modelId };
  },
};

const generateVideo: McpTool = {
  name: "generate_video",
  title: "Make a video",
  description:
    "Make one video clip from a prompt, optionally starting from an image, with Sigil's own model access. A video takes minutes: this returns a generationId at once, to collect with get_generation_status. Each call counts against the person's daily allowance.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "What happens in the shot, in full." },
      model: { type: "string", description: `A video model id from list_models. Default: ${DEFAULT_VIDEO_MODEL}.` },
      aspectRatio: { type: "string", description: "16:9 or 9:16 for most models." },
      durationSeconds: { type: "integer", minimum: 3, maximum: 15, description: "Length of the clip in seconds. Veo 3.1 takes 4, 6 or 8; Kling 3.0 takes 3 to 15; Seedance 2.5 takes 4 to 15 here." },
      resolution: { type: "string", enum: ["720p", "1080p", "4k"], description: "Where the model offers a choice. Default: the model's own." },
      startImage: {
        type: "string",
        description: "The first frame: a `ref` from create_upload_urls, or the URL of an image Sigil drew earlier.",
      },
    },
    required: ["prompt"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  async run(args, ctx) {
    const prompt = str(args, "prompt");
    if (!prompt) throw new ToolInputError("`prompt` is required.");
    const model = pickModel(args, "video");
    const aspectRatio = pickAspectRatio(args, model.supportedAspectRatios);
    const duration = args.durationSeconds === undefined ? undefined : Number(args.durationSeconds);
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 3 || duration > 15)) {
      throw new ToolInputError("`durationSeconds` must be a whole number from 3 to 15.");
    }
    const resolution = str(args, "resolution");
    if (resolution && !["720p", "1080p", "4k"].includes(resolution)) {
      throw new ToolInputError("`resolution` is 720p, 1080p or 4k.");
    }
    const start = str(args, "startImage");
    const references = await resolveReferences(start ? [start] : undefined, ctx.principal.ownerId, ctx.env);

    const refused = await allowanceRefusal(ctx, "video", 1);
    if (refused) return { ...refused, modelId: model.id };

    const generation = await createGeneration({
      ownerId: ctx.principal.ownerId,
      type: "video",
      modelId: model.id,
      prompt,
      parameters: {
        numOutputs: 1,
        ...STRICT,
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(duration ? { duration } : {}),
        ...(resolution ? { resolution } : {}),
        ...(references.urls.length > 0
          ? { referenceImageUrl: references.urls[0], referenceImagePath: references.paths[0] }
          : {}),
      },
    });
    ctx.waitUntil(processGeneration(generation).catch(() => undefined));
    return {
      modelId: model.id,
      content: [
        text(
          `The video is being made (draw ${generation.id.slice(0, 8)}). Call get_generation_status with generationId ${generation.id} in about a minute, and again every 30 seconds until it is done; do not start it again.`,
        ),
      ],
      structuredContent: { generationId: generation.id, status: "processing", modelId: model.id },
    };
  },
};

/** What Claude gets for a finished 3D model: the link to keep, the front view to look at, what to know. */
async function describeThreeD(generationId: string, state: ThreeDState, picture: string | null, previews: boolean): Promise<ToolResult> {
  const short = generationId.slice(0, 8);
  const r = state.report;
  const rigged = Boolean(r?.skinned);
  const size = r ? `${(r.bytesAfter / 1_048_576).toFixed(1)} MB` : "";
  const lines = [
    `Made the 3D model "${state.name}" (model ${short}): ${rigged ? `rigged, with ${r?.animations ?? 0} animation${r?.animations === 1 ? "" : "s"} (an idle and a wave)` : "not rigged"}${size ? `, ${size}` : ""}, ${state.credits} Meshy credits.`,
    `The model (GLB): ${state.glbUrl}`,
    "Where a folder is connected (Cowork, Claude Code), download it into the folder the work calls for. Sigil cannot write to a disk, you do. Open it in any GLB viewer, or a page with <model-viewer>, to turn it round.",
    ...(picture ? [`Its front view, for your reply: ![${state.name}, front view](${picture})`] : []),
    ...state.notes,
  ];
  const content: Content[] = [text(lines.join("\n"))];
  if (previews && picture) {
    const preview = await makeImagePreview(picture);
    if (preview) content.push(text("The front view Meshy rendered of the model, for reading:"), { type: "image", ...preview });
  }
  return {
    content,
    structuredContent: {
      generationId,
      status: "completed",
      modelId: MESH_SETTINGS.ai_model,
      model: { url: state.glbUrl, rigged, animations: r?.animations ?? 0, bytes: r?.bytesAfter ?? null, credits: state.credits },
      outputs: [{ url: state.glbUrl, type: "model" }, ...(picture ? [{ url: picture, type: "image" }] : [])],
      notes: state.notes,
    },
  };
}

function threeDProgressText(state: ThreeDState, generationId: string): string {
  const step = { mesh: "making the model", rig: "fitting the skeleton", animate: "adding the idle and the wave", finish: "finishing the file", done: "done" }[state.stage];
  return `Still working on the 3D model (model ${generationId.slice(0, 8)}): ${step}${state.stage === "mesh" ? `, ${state.progress}%` : ""}. Call get_generation_status again in about a minute; do not start it again.`;
}

const generate3d: McpTool = {
  name: "generate_3d",
  title: "Make a 3D model",
  description:
    `Make a 3D model (a GLB file) of a character or an object from one to ${MAX_VIEWS} views of it, with Sigil's own model access (no API key is needed or accepted). Views in order: front, right, back, left, each the whole figure on a plain light background, evenly lit, the same subject in every view. For a humanoid character standing in an A-pose (arms clear of the body, feet visible, no cape or long coat), set rig to true: it also gets a 24-joint skeleton with an idle and a wave. A model takes about 5 to 10 minutes: this returns a generationId at once, to collect with get_generation_status about once a minute. Each call counts against the person's daily 3D allowance.`,
  inputSchema: {
    type: "object",
    properties: {
      views: {
        type: "array",
        minItems: 1,
        maxItems: MAX_VIEWS,
        items: { type: "string" },
        description: "The views, front first: a `ref` from create_upload_urls, or the URL of an image Sigil drew earlier.",
      },
      rig: { type: "boolean", description: "A humanoid character: add a skeleton, an idle and a wave. Default false." },
      name: { type: "string", description: "What the model is, for the person's records, for example \"Ada, the shopkeeper\"." },
    },
    required: ["views"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  async run(args, ctx) {
    if (!hasMeshyKey(ctx.env)) return refusal("Sigil has no 3D model access configured yet, so nothing was made. Tell your teacher.");
    if (!Array.isArray(args.views) || args.views.length < 1 || args.views.length > MAX_VIEWS) {
      throw new ToolInputError(`\`views\` takes one to ${MAX_VIEWS} images, front first.`);
    }
    let views: { urls: string[]; paths: string[] };
    try {
      views = await resolveReferences(args.views, ctx.principal.ownerId, ctx.env);
    } catch (err) {
      if (err instanceof ToolInputError) throw new ToolInputError(err.message.replace("`references`", "`views`"));
      throw err;
    }
    const rig = args.rig === true;
    const name = (str(args, "name") ?? (rig ? "Character" : "Model")).slice(0, 120);

    const refused = await allowanceRefusal(ctx, "3d", 1);
    if (refused) return { ...refused, modelId: MESH_SETTINGS.ai_model };

    let meshTaskId: string;
    try {
      meshTaskId = await createMeshTask(ctx.env, views.urls);
    } catch (err) {
      const status = err instanceof MeshyError ? err.status : null;
      const why = status === 402 ? "Sigil's 3D credits have run out. Tell your teacher." : err instanceof Error ? err.message : "unknown error";
      return { ...refusal(`The model could not be started: ${why}`), modelId: MESH_SETTINGS.ai_model };
    }
    const generation = await createGeneration({
      ownerId: ctx.principal.ownerId,
      type: "3d",
      modelId: MESH_SETTINGS.ai_model,
      prompt: name,
      parameters: { numOutputs: 1, viewPaths: views.paths, threeD: newThreeDState({ meshTaskId, rig, name }) },
    });
    ctx.waitUntil(driveThreeD(generation.id, ctx.env, THREE_D_DRIVE_MS).catch(() => undefined));
    return {
      modelId: MESH_SETTINGS.ai_model,
      content: [
        text(
          `The 3D model is being made (model ${generation.id.slice(0, 8)})${rig ? ", then rigged and animated" : ""}; it takes about 5 to 10 minutes. Call get_generation_status with generationId ${generation.id} in about two minutes, then about once a minute until it is done; do not start it again.`,
        ),
      ],
      structuredContent: { generationId: generation.id, status: "processing", modelId: MESH_SETTINGS.ai_model },
    };
  },
};

const getGenerationStatus: McpTool = {
  name: "get_generation_status",
  title: "Collect a draw",
  description: "Whether an image, video or 3D model started earlier is done, and its files when it is.",
  inputSchema: {
    type: "object",
    properties: {
      generationId: { type: "string", description: "The id generate_image, generate_video or generate_3d returned." },
      previews: { type: "boolean", description: "Send a small copy of each image back to look at. Default true." },
    },
    required: ["generationId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async run(args, ctx) {
    const generationId = str(args, "generationId");
    if (!generationId || !/^[0-9a-f-]{36}$/i.test(generationId)) {
      throw new ToolInputError("`generationId` must be the id a draw returned.");
    }
    // Only the caller's own draws made through Claude: an id is not a way into someone's work.
    const generation = await prisma.generation.findFirst({
      where: { id: generationId, userId: ctx.principal.ownerId, source: "mcp" },
      select: {
        id: true,
        status: true,
        modelId: true,
        errorMessage: true,
        createdAt: true,
        parameters: true,
        outputs: {
          orderBy: { createdAt: "asc" },
          select: { fileUrl: true, fileType: true, width: true, height: true, duration: true },
        },
      },
    });
    if (!generation) return refusal("No draw with that id was made through this connection.");
    // A 3D model job moves on when it is collected: Meshy's stages outlast any one function.
    if (threeDStateOf(generation.parameters)) {
      if (generation.status === "failed") {
        return { ...refusal(`The model failed: ${generation.errorMessage ?? "no reason was recorded"}. It does not count against the allowance.`), modelId: generation.modelId };
      }
      const result = await advanceThreeD(generationId, ctx.env);
      if (result.status === "failed") {
        return { ...refusal(`The model failed: ${result.message} It does not count against the allowance.`), modelId: generation.modelId };
      }
      if (result.status === "completed") {
        const picture = await prisma.output.findFirst({ where: { generationId, fileType: "image" }, select: { fileUrl: true } });
        const described = await describeThreeD(generationId, result.state, picture?.fileUrl ?? null, args.previews !== false);
        return { ...described, modelId: generation.modelId };
      }
      const state = result.status === "processing" ? result.state : threeDStateOf(generation.parameters)!;
      return {
        modelId: generation.modelId,
        content: [text(threeDProgressText(state, generationId))],
        structuredContent: { generationId, status: "processing", stage: state.stage, progress: state.progress, modelId: generation.modelId },
      };
    }
    if (generation.status === "failed") {
      return { ...refusal(`The draw failed: ${generation.errorMessage ?? "no reason was recorded"}`), modelId: generation.modelId };
    }
    if (generation.status !== "completed" && Date.now() - generation.createdAt.getTime() > STALE_AFTER_MS) {
      await prisma.generation.updateMany({
        where: { id: generationId, status: { in: ["processing", "processing_locked"] } },
        data: {
          status: "failed",
          errorMessage: "The model took longer than Sigil waits for a result.",
          errorCategory: "timeout",
          errorRetryable: true,
        },
      });
      return {
        ...refusal("The draw took longer than Sigil waits for a result and was stopped. It does not count against the allowance. Try it again, shorter or at a lower resolution."),
        modelId: generation.modelId,
      };
    }
    if (generation.status !== "completed") {
      return {
        modelId: generation.modelId,
        content: [text("Still working. Ask again in about 20 seconds.")],
        structuredContent: { generationId, status: "processing", modelId: generation.modelId },
      };
    }
    const described = await describeOutputs({
      generationId,
      modelId: generation.modelId,
      outputs: generation.outputs.map((o) => ({
        url: o.fileUrl,
        fileType: o.fileType,
        width: o.width,
        height: o.height,
        duration: o.duration,
      })),
      previews: args.previews !== false,
    });
    return { ...described, modelId: generation.modelId };
  },
};

export const MCP_TOOLS: McpTool[] = [generateImage, generateVideo, generate3d, getGenerationStatus, createUploadUrls, listModels, ...EXPO_TOOLS];

export function findMcpTool(name: string): McpTool | undefined {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

export function isToolInputError(err: unknown): boolean {
  return err instanceof ToolInputError || err instanceof ExpoInputError;
}
