import { prisma } from "@/lib/prisma";

const THUMBNAILS_PER_JOURNEY = 6;

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
  options: { includeThumbnails?: boolean } = {},
): Promise<{ journeys: JourneyListItem[]; isAdmin: boolean } | null> {
  const includeThumbnails = options.includeThumbnails ?? true;
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = profile?.role === "admin";
    const journeyWhere = isAdmin ? {} : { members: { some: { userId } } };

    const workspaceProjects = await prisma.workspaceProject.findMany({
      where: journeyWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { briefings: true } },
        briefings: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            _count: { select: { sessions: true } },
            sessions: {
              select: { id: true },
            },
          },
        },
      },
    });
    const wpIds = workspaceProjects.map((wp) => wp.id);
    const sessionIdToWpId = new Map<string, string>();
    const wpIdsWithSessions = new Set<string>();
    for (const wp of workspaceProjects) {
      for (const briefing of wp.briefings) {
        for (const session of briefing.sessions) {
          sessionIdToWpId.set(session.id, wp.id);
          wpIdsWithSessions.add(wp.id);
        }
      }
    }

    const recentOutputs: {
      id: string;
      fileUrl: string;
      fileType: string;
      width: number | null;
      height: number | null;
      wpId: string;
    }[] = [];
    let recentGenerationCount = 0;
    let generationTake = 0;

    if (includeThumbnails && sessionIdToWpId.size > 0) {
      const sessionIds = Array.from(sessionIdToWpId.keys());
      generationTake = Math.min(
        Math.max(wpIdsWithSessions.size * THUMBNAILS_PER_JOURNEY * 8, 64),
        4000,
      );
      const recentGenerations = await prisma.generation.findMany({
        where: {
          sessionId: { in: sessionIds },
        },
        orderBy: { createdAt: "desc" },
        take: generationTake,
        select: {
          id: true,
          sessionId: true,
        },
      });
      recentGenerationCount = recentGenerations.length;
      const generationIdToSessionId = new Map<string, string>();
      const generationRankById = new Map<string, number>();
      let generationRank = 0;
      for (const generation of recentGenerations) {
        generationIdToSessionId.set(generation.id, generation.sessionId);
        generationRankById.set(generation.id, generationRank);
        generationRank += 1;
      }

      const generationIds = recentGenerations.map((generation) => generation.id);
      const outputRows =
        generationIds.length === 0
          ? []
          : await prisma.output.findMany({
              where: {
                generationId: { in: generationIds },
              },
              select: {
                id: true,
                fileUrl: true,
                fileType: true,
                width: true,
                height: true,
                generationId: true,
              },
            });
      const sortedOutputs = [...outputRows].sort((a, b) => {
        const aRank = generationRankById.get(a.generationId) ?? Number.MAX_SAFE_INTEGER;
        const bRank = generationRankById.get(b.generationId) ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });
      for (const output of sortedOutputs) {
        const sessionId = generationIdToSessionId.get(output.generationId);
        if (!sessionId) continue;
        const wpId = sessionIdToWpId.get(sessionId);
        if (!wpId) continue;
        recentOutputs.push({
          id: output.id,
          fileUrl: output.fileUrl,
          fileType: output.fileType,
          width: output.width,
          height: output.height,
          wpId,
        });
      }
    }
    const thumbnailsByWpId = new Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileType: string;
        width: number | null;
        height: number | null;
      }[]
    >();
    const pendingWpIds = new Set(wpIdsWithSessions);

    for (const o of recentOutputs) {
      const wpId = o.wpId;
      let list = thumbnailsByWpId.get(wpId);
      if (!list) {
        list = [];
        thumbnailsByWpId.set(wpId, list);
      }
      if (list.length < THUMBNAILS_PER_JOURNEY) {
        list.push({
          id: o.id,
          fileUrl: o.fileUrl,
          fileType: o.fileType,
          width: o.width,
          height: o.height,
        });
        if (list.length >= THUMBNAILS_PER_JOURNEY) {
          pendingWpIds.delete(wpId);
          if (pendingWpIds.size === 0) break;
        }
      }
    }

    const journeys: JourneyListItem[] = workspaceProjects.map((wp) => ({
      id: wp.id,
      name: wp.name,
      description: wp.description,
      type: (wp as unknown as { type?: string }).type ?? "create",
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
    routeCount: number;
    routes: {
      id: string;
      name: string;
      description: string | null;
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
        select: { role: true },
      }),
      prisma.workspaceProject.findUnique({
        where: { id: journeyId },
        include: {
          briefings: {
            select: {
              id: true,
              name: true,
              description: true,
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
      const latestOutputs = await prisma.output.findMany({
        where: {
          generation: {
            session: { projectId: { in: briefingIds } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: briefingIds.length * 10,
        select: {
          fileUrl: true,
          generation: {
            select: { session: { select: { projectId: true } } },
          },
        },
      });

      for (const o of latestOutputs) {
        const pid = o.generation.session.projectId;
        if (!thumbnailByProjectId.has(pid)) {
          thumbnailByProjectId.set(pid, o.fileUrl);
        }
      }
    }

    const routes = journey.briefings.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
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
