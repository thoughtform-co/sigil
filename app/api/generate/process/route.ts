import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { getModel, getModelConfig } from "@/lib/models/registry";
import { routeModel } from "@/lib/models/routing";
import { calculateGenerationCost } from "@/lib/cost/calculator";
import { uploadProviderOutput } from "@/lib/supabase/storage";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";

const processRequestSchema = z.object({
  generationId: z.string().uuid(),
});

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
        outputs: gen.outputs,
      },
    });
  } catch {
    // ignore
  }
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = processRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  if (generation.status !== "processing" && generation.status !== "processing_locked") {
    return NextResponse.json({ message: "Generation already processed", id: generation.id });
  }

  const lock = await prisma.generation.updateMany({
    where: { id: generation.id, status: "processing" },
    data: { status: "processing_locked" },
  });

  if (lock.count === 0 && generation.status !== "processing_locked") {
    return NextResponse.json({ message: "Generation already claimed", id: generation.id });
  }

  try {
    const routed = routeModel(generation.modelId);
    const adapter = getModel(routed.modelId);
    if (!adapter) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "failed" },
      });
      void broadcastUpdatedGeneration(generation.sessionId, generation.id);
      return NextResponse.json({ error: `Unknown model: ${routed.modelId}` }, { status: 400 });
    }

    const params = (generation.parameters as Record<string, unknown>) ?? {};
    const referenceImageUrl =
      typeof params.referenceImageUrl === "string" ? params.referenceImageUrl : undefined;
    const requestPayload = {
      prompt: generation.prompt,
      negativePrompt: generation.negativePrompt ?? undefined,
      ...params,
      referenceImage: referenceImageUrl,
      referenceImageUrl: referenceImageUrl,
      referenceImages: referenceImageUrl ? [referenceImageUrl] : undefined,
    };

    const result = await adapter.generate(requestPayload);

    if (result.status !== "completed" || !result.outputs?.length) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: "failed" },
      });
      void broadcastUpdatedGeneration(generation.sessionId, generation.id);

      return NextResponse.json({
        id: generation.id,
        status: "failed",
        error: result.error ?? "Generation did not produce outputs",
      });
    }
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
        try {
          const platformUrl = await uploadProviderOutput({
            sourceUrl: output.url,
            userId: generation.userId,
            generationId: generation.id,
            outputIndex: index,
            fileType,
          });
          return { ...output, url: platformUrl };
        } catch {
          // Keep image outputs durable even when storage is unavailable by inlining a data URL.
          if (fileType === "image") {
            try {
              const fallbackResponse = await fetch(output.url);
              if (fallbackResponse.ok) {
                const contentType = fallbackResponse.headers.get("content-type") || "image/png";
                const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
                if (buffer.length <= 8 * 1024 * 1024) {
                  const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
                  return { ...output, url: dataUrl };
                }
              }
            } catch {
              // Ignore and keep provider URL fallback below.
            }
          }

          // Last-resort fallback to provider URL if storage upload fails.
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
    console.error(`[generate/process] ${generation.id} failed:`, err);
    await prisma.generation
      .update({
        where: { id: generation.id },
        data: { status: "failed" },
      })
      .catch((dbErr) => console.error(`[generate/process] failed to set status failed:`, dbErr));
    void broadcastUpdatedGeneration(generation.sessionId, generation.id);
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json(
      { id: generation.id, status: "failed", error: message },
      { status: 500 },
    );
  }
}
