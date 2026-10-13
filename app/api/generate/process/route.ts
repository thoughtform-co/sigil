import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { processRequestSchema } from "@/lib/models/contracts";
import { isProcessable } from "@/lib/models/generation-status";
import { processGeneration } from "@/lib/models/process-generation";
import { unauthorized, notFound, badRequest } from "@/lib/api/errors";

export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = processRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const accessFilter = await projectAccessFilter(user.id);
  const generation = await prisma.generation.findFirst({
    where: {
      id: parsed.data.generationId,
      session: { project: accessFilter },
    },
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
    return notFound("Generation not found or access denied");
  }

  if (!isProcessable(generation.status)) {
    return NextResponse.json({ message: "Generation already processed", id: generation.id });
  }

  const outcome = await processGeneration(generation);
  switch (outcome.kind) {
    case "claimed":
      return NextResponse.json({ message: "Generation already claimed", id: generation.id });
    case "unknown_model":
      return NextResponse.json({ error: `Unknown model: ${outcome.modelId}` }, { status: 400 });
    case "ephemeral_references":
      return NextResponse.json({ id: generation.id, status: "failed", error: outcome.message }, { status: 400 });
    case "adapter_failed":
      return NextResponse.json({ id: generation.id, status: "failed", error: outcome.error });
    case "error":
      return NextResponse.json({ id: generation.id, status: "failed", error: outcome.message }, { status: 500 });
    case "completed":
      return NextResponse.json({
        id: generation.id,
        status: "completed",
        outputCount: outcome.outputs.length,
        modelId: outcome.modelId,
        routed: outcome.routed,
        routeReason: outcome.routeReason,
      });
  }
}
