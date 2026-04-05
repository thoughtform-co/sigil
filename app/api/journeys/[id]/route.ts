import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";
import { getProfileName } from "@/lib/profile-name";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t0 = Date.now();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [profile, journey] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, lockedWorkspaceProjectId: true },
    }),
    prisma.workspaceProject.findUnique({
      where: { id },
      include: {
        briefings: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: {
              select: {
                id: true,
                displayName: true,
                username: true,
              },
            },
            updatedAt: true,
            _count: { select: { sessions: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
  ]);

  if (!journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  const isAdmin = profile?.role === "admin";

  if (!isAdmin && profile?.lockedWorkspaceProjectId && id !== profile.lockedWorkspaceProjectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isAdmin) {
    const membership = await prisma.workspaceProjectMember.findUnique({
      where: {
        workspaceProjectId_userId: { workspaceProjectId: id, userId: user.id },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const briefingIds = journey.briefings.map((b) => b.id);
  const thumbnailByProjectId = new Map<string, string>();
  const activityByProjectId = new Map<string, Date>();

  if (briefingIds.length > 0) {
    const [thumbRows, activityRows] = await Promise.all([
      prisma.$queryRaw<
        { project_id: string; file_url: string }[]
      >(Prisma.sql`
        SELECT p.id AS project_id, thumb.file_url
        FROM projects p
        LEFT JOIN LATERAL (
          SELECT o.file_url
          FROM sessions s
          INNER JOIN generations g ON g.session_id = s.id
          INNER JOIN outputs o ON o.generation_id = g.id
          WHERE s.project_id = p.id
            AND g.status = 'completed'
            AND o.file_url NOT LIKE 'data:%'
          ORDER BY
            CASE WHEN o.file_type LIKE 'image/%' THEN 0 ELSE 1 END,
            g.created_at DESC, o.created_at DESC
          LIMIT 1
        ) thumb ON TRUE
        WHERE p.id = ANY(${briefingIds}::uuid[])
          AND thumb.file_url IS NOT NULL
      `),
      prisma.$queryRaw<
        { project_id: string; latest_at: Date }[]
      >(Prisma.sql`
        SELECT s.project_id, MAX(g.created_at) AS latest_at
        FROM sessions s
        INNER JOIN generations g ON g.session_id = s.id
        WHERE s.project_id = ANY(${briefingIds}::uuid[])
        GROUP BY s.project_id
      `),
    ]);
    for (const row of thumbRows) {
      thumbnailByProjectId.set(row.project_id, row.file_url);
    }
    for (const row of activityRows) {
      activityByProjectId.set(row.project_id, row.latest_at);
    }
  }

  const routesWithThumbnails = [...journey.briefings]
    .sort((a, b) => {
      const aTime = activityByProjectId.get(a.id)?.getTime() ?? a.updatedAt.getTime();
      const bTime = activityByProjectId.get(b.id)?.getTime() ?? b.updatedAt.getTime();
      return bTime - aTime;
    })
    .map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      creatorName: getProfileName(b.owner),
      updatedAt: b.updatedAt,
      waypointCount: b._count.sessions,
      thumbnailUrl: thumbnailByProjectId.get(b.id) ?? null,
    }));

  const response = NextResponse.json({
    journey: {
      id: journey.id,
      name: journey.name,
      description: journey.description,
      type: (journey as unknown as { type?: string }).type ?? "create",
      settings: (journey as unknown as { settings?: unknown }).settings ?? null,
      routeCount: journey.briefings.length,
      routes: routesWithThumbnails,
    },
  });
  response.headers.set("Server-Timing", `total;dur=${Date.now() - t0}`);
  return withCacheHeaders(response, "private-short");
}
