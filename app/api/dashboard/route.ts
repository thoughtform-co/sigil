import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const THUMBS_PER_ROUTE = 8;

export async function GET() {
  const start = Date.now();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const afterAuth = Date.now();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const isAdmin = profile?.role === "admin";
  const journeyWhere = isAdmin ? {} : { members: { some: { userId: user.id } } };

  const workspaceProjects = await prisma.workspaceProject.findMany({
    where: journeyWhere,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      _count: { select: { briefings: true } },
      briefings: {
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
          _count: { select: { sessions: true } },
        },
      },
    },
  });
  const afterWorkspace = Date.now();

  const allBriefingIds = workspaceProjects.flatMap((wp) => wp.briefings.map((b) => b.id));

  const thumbnailsByProjectId = new Map<
    string,
    { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]
  >();

  if (allBriefingIds.length > 0) {
    const thumbRows = await prisma.$queryRaw<
      { project_id: string; output_id: string; file_url: string; file_type: string; width: number | null; height: number | null; rn: bigint }[]
    >(Prisma.sql`
      SELECT sub.project_id, sub.output_id, sub.file_url, sub.file_type, sub.width, sub.height, sub.rn
      FROM (
        SELECT
          s.project_id,
          o.id AS output_id,
          o.file_url,
          o.file_type,
          o.width,
          o.height,
          ROW_NUMBER() OVER (PARTITION BY s.project_id ORDER BY g.created_at DESC, o.created_at DESC) AS rn
        FROM sessions s
        INNER JOIN generations g ON g.session_id = s.id
        INNER JOIN outputs o ON o.generation_id = g.id
        WHERE s.project_id = ANY(${allBriefingIds}::uuid[])
          AND g.status = 'completed'
      ) sub
      WHERE sub.rn <= ${THUMBS_PER_ROUTE}
      ORDER BY sub.project_id, sub.rn
    `);

    for (const row of thumbRows) {
      let list = thumbnailsByProjectId.get(row.project_id);
      if (!list) {
        list = [];
        thumbnailsByProjectId.set(row.project_id, list);
      }
      list.push({
        id: row.output_id,
        fileUrl: row.file_url,
        fileType: row.file_type,
        width: row.width,
        height: row.height,
      });
    }
  }
  const afterThumbnails = Date.now();

  const journeys = workspaceProjects.map((wp) => ({
    id: wp.id,
    name: wp.name,
    description: wp.description,
    type: wp.type ?? "create",
    routeCount: wp._count.briefings,
    generationCount: 0,
    routes: wp.briefings.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      updatedAt: b.updatedAt,
      waypointCount: b._count.sessions,
      generationCount: 0,
      thumbnails: thumbnailsByProjectId.get(b.id) ?? [],
    })),
  }));

  const response = NextResponse.json({ journeys });
  const total = Date.now() - start;
  response.headers.set(
    "Server-Timing",
    `auth;dur=${afterAuth - start},workspace;dur=${afterWorkspace - afterAuth},thumbnails;dur=${afterThumbnails - afterWorkspace},total;dur=${total}`,
  );
  return withCacheHeaders(response, "private-short");
}
