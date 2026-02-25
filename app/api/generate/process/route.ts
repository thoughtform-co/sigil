import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { getModel, getModelConfig } from "@/lib/models/registry";
import { routeModel } from "@/lib/models/routing";
import { calculateGenerationCost } from "@/lib/cost/calculator";
import { uploadProviderOutput } from "@/lib/supabase/storage";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";
import { getSafeFetchUrl } from "@/lib/security/url-safety";
import { processRequestSchema } from "@/lib/models/contracts";
import { normalizeGenerationRequest } from "@/lib/models/request-builder";
import { isProcessable } from "@/lib/models/generation-status";
import { observeGeneration } from "@/lib/observability/generation";
import { classifyError, userFacingMessage } from "@/lib/errors/classification";
import { unauthorized, notFound, badRequest } from "@/lib/api/errors";
import { json } from "@/lib/api/responses";

const HEARTBEAT_INTERVAL_MS = 10_000;

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
    broadcastGenerationUpdate({
      sessionId,
      generation: {
        id: gen.id,
        prompt: gen.prompt,
        negativePrompt: gen.negativePrompt,
        parameters: gen.parameters as Record<string, unknown>,
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

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = processRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const generation = await prisma.generation.findUnique({
    where: { id: parsed.data.generationId },
    select: {
      id: true,
      sessionId: true,
      modelId: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      status: true,
      userId: true,
    },
  });

  if (!generation) {
    return notFound("Generation not found");
  }

  if (!isProcessable(generation.status)) {
    return NextResponse.json({ message: "Generation already processed", id: generation.id });
  }

  const lock = await prisma.generation.updateMany({
    where: { id: generation.id, status: "processing" },
    data: { status: "processing_locked", lastHeartbeatAt: new Date() },
  });

  if (lock.count === 0 && generation.status !== "processing_locked") {
    return NextResponse.json({ message: "Generation already claimed", id: generation.id });
  }

  const stopHeartbeat = startHeartbeat(generation.id);

  try {
    const routed = routeModel(generation.modelId);
    const adapter = getModel(routed.modelId);
    if (!adapter) {
      stopHeartbeat();
      await markFailed(generation.id, generation.sessionId, new Error(`Unknown model: ${routed.modelId}`));
      return NextResponse.json({ error: `Unknown model: ${routed.modelId}` }, { status: 400 });
    }

    const requestPayload = normalizeGenerationRequest(
      generation.prompt,
      generation.negativePrompt,
      (generation.parameters as Record<string, unknown>) ?? {}
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
      return NextResponse.json({
        id: generation.id,
        status: "failed",
        error: adapterError,
      });
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
        const fetchHeaders =
          output.url.startsWith("gs://") && process.env.GEMINI_API_KEY
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
        } catch {
          if (fileType === "image") {
            try {
              const safeFallbackUrl = getSafeFetchUrl(output.url, { allowGsToGoogleStorage: true });
              if (safeFallbackUrl) {
                const fallbackResponse = await fetch(safeFallbackUrl);
                if (fallbackResponse.ok) {
                  const contentType = fallbackResponse.headers.get("content-type") || "image/png";
                  const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
                  if (buffer.length <= 8 * 1024 * 1024) {
                    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
                    return { ...output, url: dataUrl };
                  }
                }
              }
            } catch {
              // keep provider URL fallback
            }
          }
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

    return NextResponse.json({
      id: generation.id,
      status: "completed",
      outputCount: persistedOutputs.length,
      modelId: routed.modelId,
      routed: routed.routed,
      routeReason: routed.reason,
    });
  } catch (err) {
    stopHeartbeat();
    console.error(`[generate/process] ${generation.id} failed:`, err);
    await markFailed(generation.id, generation.sessionId, err);
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json(
      { id: generation.id, status: "failed", error: message },
      { status: 500 },
    );
  }
}
