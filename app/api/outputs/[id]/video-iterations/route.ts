import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: outputId } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 50);

  const output = await prisma.output.findFirst({
    where: {
      id: outputId,
      generation: {
        session: {
          project: {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          },
        },
      },
    },
    select: { id: true, generation: { select: { session: { select: { projectId: true } } } } },
  });

  if (!output) {
    return NextResponse.json({ error: "Output not found or access denied" }, { status: 404 });
  }

  const projectId = output.generation.session.projectId;

  const generations = await prisma.generation.findMany({
    where: {
      session: {
        type: "video",
        projectId,
        project: {
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      prompt: true,
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

  const params = (p: unknown): Record<string, unknown> =>
    typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {};
  const bySource = generations.filter(
    (g) =>
      params(g.parameters).sourceOutputId === outputId ||
      params(g.parameters).referenceImageId === outputId
  );

  const iterations = bySource.map((g) => ({
    id: g.id,
    prompt: g.prompt,
    parameters: g.parameters,
    status: g.status,
    modelId: g.modelId,
    createdAt: g.createdAt,
    outputs: g.outputs,
  }));

  const hasProcessing = iterations.some(
    (i) => i.status === "processing" || i.status === "processing_locked"
  );
  const latestStatus = iterations[0]?.status ?? null;

  return NextResponse.json({
    iterations,
    count: iterations.length,
    hasProcessing,
    latestStatus,
    sourceOutputId: outputId,
  });
}
