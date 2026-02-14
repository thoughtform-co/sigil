import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModel, getModelConfig } from "@/lib/models/registry";
import { routeModel } from "@/lib/models/routing";
import { calculateGenerationCost } from "@/lib/cost/calculator";
import { uploadProviderOutput } from "@/lib/supabase/storage";

const processRequestSchema = z.object({
  generationId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = processRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const generation = await prisma.generation.findUnique({
    where: { id: parsed.data.generationId },
    select: {
      id: true,
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

  const routed = routeModel(generation.modelId);
  const adapter = getModel(routed.modelId);
  if (!adapter) {
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: `Unknown model: ${routed.modelId}` }, { status: 400 });
  }

  const result = await adapter.generate({
    prompt: generation.prompt,
    negativePrompt: generation.negativePrompt ?? undefined,
    ...((generation.parameters as Record<string, unknown>) ?? {}),
  });

  if (result.status !== "completed" || !result.outputs?.length) {
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "failed" },
    });

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
        // Fallback to provider URL if storage upload fails.
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

  return NextResponse.json({
    id: generation.id,
    status: "completed",
    outputCount: persistedOutputs.length,
    modelId: routed.modelId,
    routed: routed.routed,
    routeReason: routed.reason,
  });
}
