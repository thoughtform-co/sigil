import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    Math.max(parseInt(limitParam || "", 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  const accessFilter = await projectAccessFilter(user.id);
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessFilter },
    select: { id: true, ownerId: true, isShared: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found or access denied" },
      { status: 404 },
    );
  }

  const showAllSessions = project.ownerId === user.id || project.isShared;

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
      generation: {
        session: {
          projectId,
          type: "image",
          ...(showAllSessions ? {} : { isPrivate: false }),
        },
      },
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
          session: { select: { name: true } },
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
    isApproved: o.isApproved,
    width: o.width,
    height: o.height,
    createdAt: o.createdAt,
  }));

  return withCacheHeaders(
    NextResponse.json({ data, nextCursor, hasMore }),
    "private-short",
  );
}
