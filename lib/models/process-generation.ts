/**
 * Runs one generation: claims it, calls the model adapter with the server's own provider keys,
 * stores the outputs and writes the result to the row.
 *
 * Shared by `POST /api/generate/process` (the web app, behind a session cookie) and the MCP
 * server (`lib/headless`, behind a per-person sign-in token). The caller checks that the person
 * may run this generation; this function does not.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModel, getModelConfig } from "@/lib/models/registry";
import { routeModel } from "@/lib/models/routing";
import { calculateGenerationCost } from "@/lib/cost/calculator";
import { uploadProviderOutput, uploadDataUriOutput } from "@/lib/supabase/storage";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";
import { normalizeGenerationRequest } from "@/lib/models/request-builder";
import { observeGeneration } from "@/lib/observability/generation";
import { classifyError, userFacingMessage } from "@/lib/errors/classification";
import { hasEphemeralReferenceUrls, hydrateReferenceParameters } from "@/lib/reference-images";

export interface ProcessableGeneration {
  id: string;
  sessionId: string;
  modelId: string;
  prompt: string;
  negativePrompt: string | null;
  parameters: unknown;
  userId: string;
}

export interface ProcessedOutput {
  url: string;
  fileType: "image" | "video";
  width: number;
  height: number;
  duration?: number;
}

export type ProcessOutcome =
  | { kind: "claimed" }
  | { kind: "unknown_model"; modelId: string }
  | { kind: "ephemeral_references"; message: string }
  | { kind: "adapter_failed"; error: string }
  | { kind: "error"; message: string }
  | {
      kind: "completed";
      outputs: ProcessedOutput[];
      cost: number | null;
      modelId: string;
      routed: boolean;
      routeReason?: string;
    };

const HEARTBEAT_INTERVAL_MS = 30_000;

async function broadcastUpdatedGeneration(sessionId: string, generationId: string): Promise<void> {
  try {
    const gen = await prisma.generation.findUnique({
      where: { id: generationId },
      select: {
        id: true,
        prompt: true,
        negativePrompt: true,
        parameters: true,
        status: true,
        modelId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        errorMessage: true,
        errorCategory: true,
        errorRetryable: true,
        outputs: {
          select: {
            id: true,
            fileUrl: true,
            fileType: true,
            isApproved: true,
            width: true,
            height: true,
            duration: true,
          },
        },
      },
    });
    if (!gen) return;
    const hydratedParameters = await hydrateReferenceParameters(
      (gen.parameters as Record<string, unknown>) ?? {},
    );
    broadcastGenerationUpdate({
      sessionId,
      generation: {
        id: gen.id,
        user: gen.user
          ? {
              id: gen.user.id,
              username: gen.user.username,
              displayName: gen.user.displayName,
            }
          : undefined,
        prompt: gen.prompt,
        negativePrompt: gen.negativePrompt,
        parameters: hydratedParameters,
        status: gen.status,
        modelId: gen.modelId,
        createdAt: gen.createdAt.toISOString(),
        errorMessage: gen.errorMessage,
        errorCategory: gen.errorCategory,
        errorRetryable: gen.errorRetryable,
        outputs: gen.outputs,
      },
    });
  } catch {
    // ignore broadcast failures
  }
}

async function markFailed(
  generationId: string,
  sessionId: string,
  err: unknown,
): Promise<void> {
  const classified = classifyError(err);
  const friendlyMessage = userFacingMessage(classified);
  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "failed",
        errorMessage: friendlyMessage,
        errorCategory: classified.category,
        errorRetryable: classified.isRetryable,
      },
    });
  } catch (dbErr) {
    console.error(`[generate/process] failed to persist error for ${generationId}:`, dbErr);
  }
  void broadcastUpdatedGeneration(sessionId, generationId);
}

function startHeartbeat(generationId: string): () => void {
  const timer = setInterval(async () => {
    try {
      await prisma.generation.updateMany({
        where: { id: generationId, status: { in: ["processing", "processing_locked"] } },
        data: { lastHeartbeatAt: new Date() },
      });
    } catch {
      // heartbeat is best-effort
    }
  }, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
}

function needsGoogleKey(url: string): boolean {
  if (url.startsWith("gs://")) return true;
  try {
    return new URL(url).hostname === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}

export async function processGeneration(generation: ProcessableGeneration): Promise<ProcessOutcome> {
  const lock = await prisma.generation.updateMany({
    where: { id: generation.id, status: "processing" },
    data: { status: "processing_locked", lastHeartbeatAt: new Date() },
  });

  if (lock.count === 0) {
    return { kind: "claimed" };
  }

  const stopHeartbeat = startHeartbeat(generation.id);

  try {
    const routed = routeModel(generation.modelId);
    const storedParameters = (generation.parameters as Record<string, unknown> | null) ?? {};
    // A caller that refuses a fallback gets the model it asked for or a plain failure.
    if (routed.routed && storedParameters.allowFallback === false) {
      stopHeartbeat();
      const error = `${generation.modelId} is not available on this server right now, and this draw does not accept another model in its place.`;
      await markFailed(generation.id, generation.sessionId, new Error(error));
      return { kind: "adapter_failed", error };
    }
    const adapter = getModel(routed.modelId);
    if (!adapter) {
      stopHeartbeat();
      await markFailed(generation.id, generation.sessionId, new Error(`Unknown model: ${routed.modelId}`));
      return { kind: "unknown_model", modelId: routed.modelId };
    }

    const hydratedGenerationParameters = await hydrateReferenceParameters(
      (generation.parameters as Record<string, unknown>) ?? {},
    );
    if (hasEphemeralReferenceUrls(hydratedGenerationParameters)) {
      stopHeartbeat();
      const message =
        "Generation references were stored as browser-local URLs and cannot be processed. Reattach the reference images and try again.";
      await markFailed(generation.id, generation.sessionId, new Error(message));
      return { kind: "ephemeral_references", message };
    }
    const requestPayload = normalizeGenerationRequest(
      generation.prompt,
      generation.negativePrompt,
      hydratedGenerationParameters,
    );

    observeGeneration({ type: "start", generationId: generation.id, modelId: routed.modelId });
    const result = await adapter.generate(requestPayload);

    if (result.status !== "completed" || !result.outputs?.length) {
      stopHeartbeat();
      const adapterError = result.error ?? "Generation did not produce outputs";
      observeGeneration({
        type: "adapter_failed",
        generationId: generation.id,
        modelId: routed.modelId,
        error: adapterError,
      });
      await markFailed(generation.id, generation.sessionId, new Error(adapterError));
      return { kind: "adapter_failed", error: adapterError };
    }

    stopHeartbeat();

    const outputs = result.outputs;
    const modelConfig = getModelConfig(routed.modelId);
    const computedCost =
      modelConfig
        ? calculateGenerationCost({
            model: modelConfig,
            outputCount: outputs.length,
            predictTimeSeconds: result.metrics?.predictTime,
            outputHasVideo: outputs.some((output) => Boolean(output.duration)),
          })
        : undefined;

    const persistedOutputs = await Promise.all(
      outputs.map(async (output, index) => {
        const fileType = output.duration ? "video" : "image";

        if (output.url.startsWith("data:")) {
          const platformUrl = await uploadDataUriOutput({
            dataUri: output.url,
            userId: generation.userId,
            generationId: generation.id,
            outputIndex: index,
          });
          return { ...output, url: platformUrl };
        }

        // A Veo video is a Google file link that only opens with the API key (as in Vesper).
        const fetchHeaders =
          needsGoogleKey(output.url) && process.env.GEMINI_API_KEY
            ? { "x-goog-api-key": process.env.GEMINI_API_KEY }
            : undefined;
        try {
          const platformUrl = await uploadProviderOutput({
            sourceUrl: output.url,
            userId: generation.userId,
            generationId: generation.id,
            outputIndex: index,
            fileType,
            fetchHeaders,
          });
          return { ...output, url: platformUrl };
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          // A link that needs the server's key is no use to anyone else: fail rather than keep it.
          if (needsGoogleKey(output.url)) {
            throw new Error(`The video was made but could not be stored: ${reason}`);
          }
          console.warn(
            `[generate/process] Storage upload failed for output ${index}, keeping provider URL: ${reason}`,
          );
          return output;
        }
      }),
    );

    await prisma.$transaction(async (tx) => {
      await tx.generation.update({
        where: { id: generation.id },
        data: {
          status: "completed",
          modelId: routed.modelId,
          cost: typeof computedCost === "number" ? new Prisma.Decimal(computedCost) : undefined,
          errorMessage: null,
          errorCategory: null,
          errorRetryable: null,
        },
      });

      await tx.output.createMany({
        data: persistedOutputs.map((output) => ({
          generationId: generation.id,
          fileUrl: output.url,
          fileType: output.duration ? "video" : "image",
          width: output.width,
          height: output.height,
          duration: output.duration,
        })),
      });
    });

    void broadcastUpdatedGeneration(generation.sessionId, generation.id);

    return {
      kind: "completed",
      outputs: persistedOutputs.map((output) => ({
        url: output.url,
        fileType: output.duration ? "video" : "image",
        width: output.width,
        height: output.height,
        duration: output.duration,
      })),
      cost: typeof computedCost === "number" ? computedCost : null,
      modelId: routed.modelId,
      routed: routed.routed,
      routeReason: routed.reason,
    };
  } catch (err) {
    stopHeartbeat();
    console.error(`[generate/process] ${generation.id} failed:`, err);
    await markFailed(generation.id, generation.sessionId, err);
    const message = err instanceof Error ? err.message : "Processing failed";
    return { kind: "error", message };
  }
}
