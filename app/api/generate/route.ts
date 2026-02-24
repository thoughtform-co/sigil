import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/models/registry";
import { getAuthedUser } from "@/lib/auth/server";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";

const generateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modelId: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).default({}),
  source: z.enum(["session", "workflow"]).optional(),
  workflowExecutionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modelId, negativePrompt, parameters, prompt, sessionId, source, workflowExecutionId } = parsed.data;

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: { id: true, type: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const modelConfig = getModelConfig(modelId);
  if (!modelConfig) {
    return NextResponse.json({ error: "Model not found" }, { status: 400 });
  }
  if (modelConfig.type !== session.type) {
    return NextResponse.json(
      { error: "Model type does not match session type (image vs video)" },
      { status: 400 },
    );
  }

  const generation = await prisma.generation.create({
    data: {
      sessionId,
      userId: user.id,
      modelId,
      prompt,
      negativePrompt,
      parameters: parameters as Prisma.InputJsonValue,
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
      prompt,
      negativePrompt: negativePrompt ?? null,
      parameters: parameters as Record<string, unknown>,
      status: generation.status,
      modelId,
      createdAt: generation.createdAt.toISOString(),
    },
  });

  const processUrl = new URL("/api/generate/process", request.url);
  void fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId: generation.id }),
    cache: "no-store",
  }).catch(() => {
    // Processing endpoint failures are reflected by stale processing status;
    // retry policies are added in the queue phase.
  });

  return NextResponse.json({ generation }, { status: 202 });
}
