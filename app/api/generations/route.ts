import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";
import { projectAccessFilter } from "@/lib/auth/project-access";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

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

  const accessFilter = await projectAccessFilter(user.id);
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      project: accessFilter,
    },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = searchParams.get("cursor");

  const generations = await prisma.generation.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
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

  const hasMore = generations.length > limit;
  const items = hasMore ? generations.slice(0, limit) : generations;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return withCacheHeaders(
    NextResponse.json({ generations: items, nextCursor }),
    "private-short",
  );
}
