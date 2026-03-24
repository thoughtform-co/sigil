import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getProfileName } from "@/lib/profile-name";

const THUMBS_PER_JOURNEY = 6;

export type JourneyListItem = {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: { id: string; name: string; updatedAt: string; waypointCount: number }[];
  thumbnails: {
    id: string;
    fileUrl: string;
    fileType: string;
    width: number | null;
    height: number | null;
  }[];
};

export async function prefetchJourneysList(
  userId: string,
  options?: { includeThumbnails?: boolean },
): Promise<{ journeys: JourneyListItem[]; isAdmin: boolean } | null> {
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

    const wpIds = workspaceProjects.map((wp) => wp.id);
    const thumbnailsByWpId = new Map<
      string,
      { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]
    >();

    if (includeThumbnails && wpIds.length > 0) {
      const thumbRows = await prisma.$queryRaw<
        { wp_id: string; output_id: string; file_url: string; file_type: string; width: number | null; height: number | null; rn: bigint }[]
      >(Prisma.sql`
        SELECT sub.wp_id, sub.output_id, sub.file_url, sub.file_type, sub.width, sub.height, sub.rn
        FROM (
          SELECT
            p.workspace_project_id AS wp_id,
            o.id AS output_id,
            o.file_url,
            o.file_type,
            o.width,
            o.height,
            ROW_NUMBER() OVER (PARTITION BY p.workspace_project_id ORDER BY g.created_at DESC, o.created_at DESC) AS rn
          FROM projects p
          INNER JOIN sessions s ON s.project_id = p.id
          INNER JOIN generations g ON g.session_id = s.id
          INNER JOIN outputs o ON o.generation_id = g.id
          WHERE p.workspace_project_id = ANY(${wpIds}::uuid[])
            AND g.status = 'completed'
            AND o.file_url NOT LIKE 'data:%'
        ) sub
        WHERE sub.rn <= ${THUMBS_PER_JOURNEY}
        ORDER BY sub.wp_id, sub.rn
      `);

      for (const row of thumbRows) {
        let list = thumbnailsByWpId.get(row.wp_id);
        if (!list) {
          list = [];
          thumbnailsByWpId.set(row.wp_id, list);
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
    const journeys: JourneyListItem[] = workspaceProjects.map((wp) => ({
      id: wp.id,
      name: wp.name,
      description: wp.description,
      type: wp.type ?? "create",
      routeCount: wp._count.briefings,
      generationCount: 0,
      routes: wp.briefings.map((b) => ({
        id: b.id,
        name: b.name,
        updatedAt: b.updatedAt.toISOString(),
        waypointCount: b._count.sessions,
      })),
      thumbnails: thumbnailsByWpId.get(wp.id) ?? [],
    }));
    return { journeys, isAdmin };
  } catch {
    return null;
  }
}

export type JourneyDetailData = {
  journey: {
    id: string;
    name: string;
    description: string | null;
    type?: string;
    settings?: unknown;
    routeCount: number;
    routes: {
      id: string;
      name: string;
      description: string | null;
      creatorName?: string | null;
      updatedAt: string;
      waypointCount: number;
      thumbnailUrl: string | null;
    }[];
  };
};

export async function prefetchJourneyDetail(
  userId: string,
  journeyId: string,
): Promise<{ data: JourneyDetailData; isAdmin: boolean } | null> {
  try {
    const [profile, journey] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true, lockedWorkspaceProjectId: true },
      }),
      prisma.workspaceProject.findUnique({
        where: { id: journeyId },
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

    if (!journey) return null;

    const isAdmin = profile?.role === "admin";

    if (!isAdmin && profile?.lockedWorkspaceProjectId && journeyId !== profile.lockedWorkspaceProjectId) {
      return null;
    }

    if (!isAdmin) {
      const membership = await prisma.workspaceProjectMember.findUnique({
        where: {
          workspaceProjectId_userId: {
            workspaceProjectId: journeyId,
            userId,
          },
        },
      });
      if (!membership) return null;
    }

    const briefingIds = journey.briefings.map((b) => b.id);
    const thumbnailByProjectId = new Map<string, string>();

    if (briefingIds.length > 0) {
      const thumbRows = await prisma.$queryRaw<
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
          ORDER BY g.created_at DESC, o.created_at DESC
          LIMIT 1
        ) thumb ON TRUE
        WHERE p.id = ANY(${briefingIds}::uuid[])
          AND thumb.file_url IS NOT NULL
      `);
      for (const row of thumbRows) {
        thumbnailByProjectId.set(row.project_id, row.file_url);
      }
    }

    const routes = journey.briefings.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      creatorName: getProfileName(b.owner),
      updatedAt: b.updatedAt.toISOString(),
      waypointCount: b._count.sessions,
      thumbnailUrl: thumbnailByProjectId.get(b.id) ?? null,
    }));

    return {
      data: {
        journey: {
          id: journey.id,
          name: journey.name,
          description: journey.description,
          type: (journey as unknown as { type?: string }).type ?? "create",
          settings: (journey as unknown as { settings?: unknown }).settings ?? null,
          routeCount: journey.briefings.length,
          routes,
        },
      },
      isAdmin,
    };
  } catch {
    return null;
  }
}
