import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";
import { getProcessor } from "@/lib/models/processor";
import { hydrateReferenceParameters } from "@/lib/reference-images";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const accessFilter = await projectAccessFilter(user.id);
  const source = await prisma.generation.findFirst({
    where: { id, session: { project: accessFilter } },
    select: {
      id: true,
      sessionId: true,
      modelId: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      source: true,
      workflowExecutionId: true,
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Generation not found or access denied" }, { status: 404 });
  }

  const hydratedParameters = await hydrateReferenceParameters(
    (source.parameters as Record<string, unknown>) ?? {},
  );

  const generation = await prisma.generation.create({
    data: {
      sessionId: source.sessionId,
      userId: user.id,
      modelId: source.modelId,
      prompt: source.prompt,
      negativePrompt: source.negativePrompt,
      parameters: hydratedParameters as Prisma.InputJsonValue,
      status: "processing",
      ...(source.source === "workflow" && {
        source: "workflow",
        workflowExecutionId: source.workflowExecutionId ?? undefined,
      }),
    },
    select: {
      id: true,
      sessionId: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      status: true,
      modelId: true,
      createdAt: true,
      source: true,
      workflowExecutionId: true,
    },
  });

  broadcastGenerationUpdate({
    sessionId: generation.sessionId,
    generation: {
      id: generation.id,
      prompt: generation.prompt,
      negativePrompt: generation.negativePrompt,
      parameters: generation.parameters as Record<string, unknown>,
      status: generation.status,
      modelId: generation.modelId,
      createdAt: generation.createdAt.toISOString(),
    },
  });

  const baseUrl = new URL(request.url).origin;
  void getProcessor().enqueue(generation.id, baseUrl, {
    cookie: request.headers.get("cookie"),
  });

  return NextResponse.json({ generation, rerunOf: source.id }, { status: 202 });
}
