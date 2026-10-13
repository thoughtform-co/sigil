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

export const DEFAULT_IMAGE_MODEL = "gemini-nano-banana-pro";
export const DEFAULT_VIDEO_MODEL = "veo-3.1";
/** Models that exist only as a fallback route, never something to ask for. */
const HIDDEN_MODELS = new Set(["nano-banana-backup"]);
const MAX_IMAGES_PER_CALL = 4;
const MAX_REFERENCES = 8;
const MAX_UPLOADS_PER_CALL = 8;
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
async function resolveReferences(
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

async function createGeneration(input: {
  ownerId: string;
  type: "image" | "video";
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

function failureText(outcome: Exclude<ProcessOutcome, { kind: "completed" }>): string {
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
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const admin = createAdminClient();
    const uploads = [];
    for (const file of files as Array<Record<string, unknown>>) {
      const mimeType = typeof file?.mimeType === "string" ? file.mimeType : "";
      const ext = extensions[mimeType];
      if (!ext) throw new ToolInputError("Each file needs a mimeType of image/jpeg, image/png or image/webp.");
      const path = `references/${ctx.principal.ownerId}/mcp-${randomUUID()}.${ext}`;
      const { data, error } = await admin.storage.from(REFERENCES_BUCKET).createSignedUploadUrl(path);
      if (error || !data?.signedUrl) {
        throw new Error(`Could not prepare an upload: ${error?.message ?? "unknown error"}`);
      }
      uploads.push({
        name: typeof file.name === "string" ? file.name.slice(0, 200) : null,
        mimeType,
        ref: path,
        uploadUrl: data.signedUrl,
      });
    }
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
      durationSeconds: { type: "integer", minimum: 2, maximum: 12, description: "Length of the clip, where the model lets you choose." },
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
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 2 || duration > 12)) {
      throw new ToolInputError("`durationSeconds` must be a whole number from 2 to 12.");
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
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(duration ? { duration } : {}),
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

const getGenerationStatus: McpTool = {
  name: "get_generation_status",
  title: "Collect a draw",
  description: "Whether an image or video started earlier is done, and its files when it is.",
  inputSchema: {
    type: "object",
    properties: {
      generationId: { type: "string", description: "The id generate_image or generate_video returned." },
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
        outputs: {
          orderBy: { createdAt: "asc" },
          select: { fileUrl: true, fileType: true, width: true, height: true, duration: true },
        },
      },
    });
    if (!generation) return refusal("No draw with that id was made through this connection.");
    if (generation.status === "failed") {
      return { ...refusal(`The draw failed: ${generation.errorMessage ?? "no reason was recorded"}`), modelId: generation.modelId };
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

export const MCP_TOOLS: McpTool[] = [generateImage, generateVideo, getGenerationStatus, createUploadUrls, listModels];

export function findMcpTool(name: string): McpTool | undefined {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

export function isToolInputError(err: unknown): boolean {
  return err instanceof ToolInputError;
}
