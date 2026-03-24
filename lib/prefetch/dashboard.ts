import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { DashboardData } from "@/components/dashboard/DashboardView";

const THUMBS_PER_ROUTE = 8;

export async function prefetchDashboard(
  userId: string,
  options?: { includeThumbnails?: boolean },
): Promise<{ data: DashboardData; isAdmin: boolean } | null> {
  const includeThumbnails = options?.includeThumbnails ?? true;
  try {
    const wpSelect = {
      id: true,
      name: true,
      description: true,
      type: true,
      updatedAt: true,
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
      members: {
        where: { userId },
        select: { userId: true },
      },
    } as const;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, lockedWorkspaceProjectId: true },
    });
    const isAdmin = profile?.role === "admin";
    const lockId = !isAdmin ? (profile?.lockedWorkspaceProjectId ?? null) : null;

    const allWorkspaceProjects = lockId
      ? (await prisma.workspaceProject.findFirst({
          where: { id: lockId, members: { some: { userId } } },
          select: wpSelect,
        }).then((one) => (one ? [one] : [])))
      : await prisma.workspaceProject.findMany({
          orderBy: { updatedAt: "desc" },
          select: wpSelect,
        });

    const filteredProjects = isAdmin
      ? allWorkspaceProjects
      : allWorkspaceProjects.filter((wp) => wp.members.length > 0);

    const filteredIds = filteredProjects.map((wp) => wp.id);
    const activityByWpId = new Map<string, Date>();
    if (filteredIds.length > 0) {
      const activityRows = await prisma.$queryRaw<
        { wp_id: string; latest_at: Date }[]
      >(Prisma.sql`
        SELECT
          p.workspace_project_id AS wp_id,
          MAX(g.created_at) AS latest_at
        FROM projects p
        INNER JOIN sessions s ON s.project_id = p.id
        INNER JOIN generations g ON g.session_id = s.id
        WHERE p.workspace_project_id = ANY(${filteredIds}::uuid[])
        GROUP BY p.workspace_project_id
      `);
      for (const row of activityRows) {
        activityByWpId.set(row.wp_id, row.latest_at);
      }
    }
    const workspaceProjects = [...filteredProjects].sort((a, b) => {
      const aTime = activityByWpId.get(a.id)?.getTime() ?? a.updatedAt.getTime();
      const bTime = activityByWpId.get(b.id)?.getTime() ?? b.updatedAt.getTime();
      return bTime - aTime;
    });

    const allBriefingIds = workspaceProjects.flatMap((wp) =>
      wp.briefings.map((b) => b.id),
    );

    const thumbnailsByProjectId = new Map<
      string,
      { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]
    >();

    if (includeThumbnails && allBriefingIds.length > 0) {
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
            AND o.file_url NOT LIKE 'data:%'
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
        updatedAt: b.updatedAt.toISOString(),
        waypointCount: b._count.sessions,
        generationCount: 0,
        thumbnails: thumbnailsByProjectId.get(b.id) ?? [],
      })),
    }));
    return { data: { journeys }, isAdmin };
  } catch {
    return null;
  }
}
