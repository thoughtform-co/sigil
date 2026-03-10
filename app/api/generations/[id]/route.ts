import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STALL_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * DELETE /api/generations/[id]
 * Permanently removes a failed or stalled generation (and its outputs via cascade).
 * A generation is considered stalled when its status is processing/processing_locked
 * and it has not received a heartbeat within STALL_THRESHOLD_MS.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const accessFilter = await projectAccessFilter(user.id);
  const generation = await prisma.generation.findFirst({
    where: { id, session: { project: accessFilter } },
    select: { id: true, status: true, createdAt: true, lastHeartbeatAt: true },
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation not found or access denied" }, { status: 404 });
  }

  const isFailed = generation.status === "failed";
  const isProcessing = generation.status === "processing" || generation.status === "processing_locked";
  const latestSignal = generation.lastHeartbeatAt ?? generation.createdAt;
  const isStalled = isProcessing && Date.now() - new Date(latestSignal).getTime() > STALL_THRESHOLD_MS;

  if (!isFailed && !isStalled) {
    return NextResponse.json(
      { error: "Only failed or stalled generations can be dismissed" },
      { status: 400 },
    );
  }

  await prisma.generation.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
}
