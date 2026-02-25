import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";
import { projectAccessFilter } from "@/lib/auth/project-access";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

const GENERATION_SELECT = {
  id: true,
  sessionId: true,
  prompt: true,
  negativePrompt: true,
  parameters: true,
  status: true,
  modelId: true,
  createdAt: true,
  source: true,
  errorMessage: true,
  errorCategory: true,
  errorRetryable: true,
  lastHeartbeatAt: true,
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
} as const;

export async function GET(request: Request) {
  const t0 = performance.now();

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const projectId = searchParams.get("projectId");

  const accessFilter = await projectAccessFilter(user.id);

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...accessFilter },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = searchParams.get("cursor");

    const tQuery = performance.now();
    const generations = await prisma.generation.findMany({
      where: { session: { projectId } },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: GENERATION_SELECT,
    });
    const queryMs = Math.round(performance.now() - tQuery);

    const hasMore = generations.length > limit;
    const items = hasMore ? generations.slice(0, limit) : generations;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const totalMs = Math.round(performance.now() - t0);

    const response = NextResponse.json({ generations: items, nextCursor });
    response.headers.set("Server-Timing", `query;dur=${queryMs}, total;dur=${totalMs}`);
    return withCacheHeaders(response, "private-short");
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId or projectId is required" }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, project: accessFilter },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = searchParams.get("cursor");

  const tQuery = performance.now();
  const generations = await prisma.generation.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: GENERATION_SELECT,
  });
  const queryMs = Math.round(performance.now() - tQuery);

  const hasMore = generations.length > limit;
  const items = hasMore ? generations.slice(0, limit) : generations;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  const totalMs = Math.round(performance.now() - t0);

  const response = NextResponse.json({ generations: items, nextCursor });
  response.headers.set("Server-Timing", `query;dur=${queryMs}, total;dur=${totalMs}`);
  return withCacheHeaders(response, "private-short");
}
