import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

export async function GET(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

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

  const generations = await prisma.generation.findMany({
    where: { sessionId },
    // Vesper flow: older entries first so newest render at the bottom.
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      prompt: true,
      negativePrompt: true,
      parameters: true,
      status: true,
      modelId: true,
      createdAt: true,
      source: true,
      workflowExecutionId: true,
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

  return NextResponse.json({ generations });
}
