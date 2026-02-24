import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { broadcastGenerationUpdate } from "@/lib/supabase/realtime";

const generateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modelId: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modelId, negativePrompt, parameters, prompt, sessionId } = parsed.data;

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: { id: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
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
