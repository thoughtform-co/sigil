import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const projectIdFilter = searchParams.get("projectId");
  const limit = Math.min(
    Math.max(parseInt(limitParam || "", 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  const accessFilter = await projectAccessFilter(user.id);
  const accessibleProjects = await prisma.project.findMany({
    where: {
      ...(projectIdFilter ? { id: projectIdFilter } : {}),
      ...accessFilter,
    },
    select: { id: true, name: true, ownerId: true, isShared: true },
  });

  if (accessibleProjects.length === 0) {
    return NextResponse.json({
      data: [],
      projects: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  const fullAccessIds = accessibleProjects
    .filter((p) => p.ownerId === user.id || p.isShared)
    .map((p) => p.id);
  const restrictedIds = accessibleProjects
    .filter((p) => p.ownerId !== user.id && !p.isShared)
    .map((p) => p.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionFilter: any[] = [];
  if (fullAccessIds.length > 0) {
    sessionFilter.push({
      generation: {
        session: { projectId: { in: fullAccessIds }, type: "image" },
      },
    });
  }
  if (restrictedIds.length > 0) {
    sessionFilter.push({
      generation: {
        session: {
          projectId: { in: restrictedIds },
          type: "image",
          isPrivate: false,
        },
      },
    });
  }

  if (sessionFilter.length === 0) {
    return NextResponse.json({
      data: [],
      projects: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  let cursorFilter = {};
  if (cursorParam) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursorParam, "base64url").toString("utf-8"),
      );
      cursorFilter = {
        OR: [
          { createdAt: { lt: new Date(decoded.createdAt) } },
          {
            createdAt: { equals: new Date(decoded.createdAt) },
            id: { lt: decoded.id },
          },
        ],
      };
    } catch {
      // invalid cursor — ignore
    }
  }

  const outputs = await prisma.output.findMany({
    where: {
      ...cursorFilter,
      OR: sessionFilter,
      fileType: "image",
    },
    select: {
      id: true,
      fileUrl: true,
      isApproved: true,
      width: true,
      height: true,
      createdAt: true,
      generation: {
        select: {
          id: true,
          prompt: true,
          session: {
            select: {
              name: true,
              projectId: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = outputs.length > limit;
  const pageOutputs = hasMore ? outputs.slice(0, limit) : outputs;

  let nextCursor: string | null = null;
  if (hasMore && pageOutputs.length > 0) {
    const last = pageOutputs[pageOutputs.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }),
    ).toString("base64url");
  }

  const data = pageOutputs.map((o) => ({
    id: o.id,
    url: o.fileUrl,
    prompt: o.generation.prompt,
    generationId: o.generation.id,
    sessionName: o.generation.session.name,
    projectId: o.generation.session.projectId,
    projectName: o.generation.session.project.name,
    isApproved: o.isApproved,
    width: o.width,
    height: o.height,
    createdAt: o.createdAt,
  }));

  const projectMap = new Map<string, { id: string; name: string }>();
  for (const img of data) {
    if (img.projectId && !projectMap.has(img.projectId)) {
      projectMap.set(img.projectId, {
        id: img.projectId,
        name: img.projectName,
      });
    }
  }

  return withCacheHeaders(
    NextResponse.json({
      data,
      projects: Array.from(projectMap.values()),
      nextCursor,
      hasMore,
    }),
    "private-short",
  );
}
