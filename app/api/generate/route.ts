import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/models/registry";
import { getAuthedUser } from "@/lib/auth/server";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";
import { generateRequestSchema } from "@/lib/models/contracts";
import { unauthorized, notFound, badRequest } from "@/lib/api/errors";
import { json } from "@/lib/api/responses";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProcessor } from "@/lib/models/processor";
import { projectAccessFilter } from "@/lib/auth/project-access";
import {
  hasEphemeralReferenceUrls,
  hydrateReferenceParameters,
  persistReferenceImage,
} from "@/lib/reference-images";

export const maxDuration = 30;

export async function POST(request: Request) {
  const t0 = performance.now();
  try {
    const user = await getAuthedUser();
    if (!user) return unauthorized();

    const rateLimitResponse = checkRateLimit("generate", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const { modelId, negativePrompt, parameters, prompt, sessionId, source, workflowExecutionId } = parsed.data;

    let workingParameters: Record<string, unknown> = { ...parameters };
    const endFrameInline = workingParameters.endFrameImage;
    if (typeof endFrameInline === "string" && endFrameInline.startsWith("data:")) {
      const persisted = await persistReferenceImage(endFrameInline, user.id);
      workingParameters = {
        ...workingParameters,
        endFrameImageUrl: persisted.referenceImageUrl,
        endFrameImagePath: persisted.referenceImagePath,
      };
      delete workingParameters.endFrameImage;
    }
    if (hasEphemeralReferenceUrls(workingParameters)) {
      return badRequest(
        "Reference images must be uploaded before generation. Please reattach the image and try again."
      );
    }

    const hydratedParameters = await hydrateReferenceParameters(workingParameters);

    const accessFilter = await projectAccessFilter(user.id);
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });
    const session = await prisma.session.findFirst({
      where: { id: sessionId, project: accessFilter },
      select: { id: true, type: true },
    });

    if (!session) return notFound("Session not found or access denied");

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) return badRequest("Model not found");
    if (modelConfig.type !== session.type) {
      return badRequest("Model type does not match session type (image vs video)");
    }

    const generation = await prisma.generation.create({
      data: {
        sessionId,
        userId: user.id,
        modelId,
        prompt,
        negativePrompt,
        parameters: hydratedParameters as Prisma.InputJsonValue,
        status: "processing",
        ...(source === "workflow" && { source: "workflow", workflowExecutionId: workflowExecutionId ?? undefined }),
      },
      select: {
        id: true,
        status: true,
        modelId: true,
        createdAt: true,
      },
    });

    broadcastGenerationUpdate({
      sessionId,
      generation: {
        id: generation.id,
        user: profile
          ? {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
            }
          : undefined,
        prompt,
        negativePrompt: negativePrompt ?? null,
        parameters: hydratedParameters,
        status: generation.status,
        modelId,
        createdAt: generation.createdAt.toISOString(),
      },
    });

    const baseUrl = new URL(request.url).origin;
    void getProcessor().enqueue(generation.id, baseUrl, {
      cookie: request.headers.get("cookie"),
    });

    const response = json({ generation }, 202);
    response.headers.set("Server-Timing", `total;dur=${Math.round(performance.now() - t0)}`);
    return response;
  } catch (error) {
    console.error("Generate route error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
