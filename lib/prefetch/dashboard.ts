import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/components/dashboard/DashboardView";

const THUMBS_PER_ROUTE = 8;

export async function prefetchDashboard(
  userId: string,
  options: { includeThumbnails?: boolean } = {},
): Promise<{ data: DashboardData; isAdmin: boolean } | null> {
  const prefetchStart = Date.now();
  const runId = `prefetch-${prefetchStart}`;
  const includeThumbnails = options.includeThumbnails ?? true;
  // #region agent log
  void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H3',location:'lib/prefetch/dashboard.ts:start',message:'prefetchDashboard started',data:{includeThumbnails,userIdPresent:Boolean(userId)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
            description: true,
            updatedAt: true,
            _count: { select: { sessions: true } },
            sessions: {
              select: { id: true, _count: { select: { generations: true } } },
            },
          },
        },
      },
    });
    // #region agent log
    void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H2',location:'lib/prefetch/dashboard.ts:after-workspace',message:'Workspace projects query completed',data:{elapsedMs:Date.now()-prefetchStart,projectCount:workspaceProjects.length,isAdmin},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const briefingIds = workspaceProjects.flatMap((wp) =>
      wp.briefings.map((b) => b.id),
    );
    const sessionIdToProjectId = new Map<string, string>();
    const projectIdsWithSessions = new Set<string>();
    for (const wp of workspaceProjects) {
      for (const briefing of wp.briefings) {
        for (const session of briefing.sessions) {
          sessionIdToProjectId.set(session.id, briefing.id);
          projectIdsWithSessions.add(briefing.id);
        }
      }
    }

    const thumbnailsByProjectId = new Map<
      string,
      {
        id: string;
        fileUrl: string;
        fileType: string;
        width: number | null;
        height: number | null;
        sessionId: string;
      }[]
    >();

    if (includeThumbnails && sessionIdToProjectId.size > 0) {
      const sessionIds = Array.from(sessionIdToProjectId.keys());
      const generationTake = Math.min(
        Math.max(briefingIds.length * THUMBS_PER_ROUTE * 8, 64),
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

      const generationIdToSessionId = new Map<string, string>();
      const generationRankById = new Map<string, number>();
      let generationRank = 0;
      for (const generation of recentGenerations) {
        generationIdToSessionId.set(generation.id, generation.sessionId);
        generationRankById.set(generation.id, generationRank);
        generationRank += 1;
      }

      const generationIds = recentGenerations.map((generation) => generation.id);
      const recentOutputs =
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
      const pendingProjectIds = new Set(projectIdsWithSessions);
      const sortedOutputs = [...recentOutputs].sort((a, b) => {
        const aRank = generationRankById.get(a.generationId) ?? Number.MAX_SAFE_INTEGER;
        const bRank = generationRankById.get(b.generationId) ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });

      for (const output of sortedOutputs) {
        const sessionId = generationIdToSessionId.get(output.generationId);
        if (!sessionId) continue;
        const pid = sessionIdToProjectId.get(sessionId);
        if (!pid) continue;
        let list = thumbnailsByProjectId.get(pid);
        if (!list) {
          list = [];
          thumbnailsByProjectId.set(pid, list);
        }
        if (list.length >= THUMBS_PER_ROUTE) continue;
        list.push({
          id: output.id,
          fileUrl: output.fileUrl,
          fileType: output.fileType,
          width: output.width,
          height: output.height,
          sessionId,
        });
        if (list.length >= THUMBS_PER_ROUTE) {
          pendingProjectIds.delete(pid);
          if (pendingProjectIds.size === 0) {
            break;
          }
        }
      }
      // #region agent log
      void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H3',location:'lib/prefetch/dashboard.ts:after-thumbnails',message:'Thumbnail hydration completed',data:{elapsedMs:Date.now()-prefetchStart,sessionCount:sessionIdToProjectId.size,generationCount:generationIds.length,outputCount:recentOutputs.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    const journeys = workspaceProjects.map((wp) => {
      const totalGenerations = wp.briefings.reduce(
        (sum, b) =>
          sum + b.sessions.reduce((s, sess) => s + sess._count.generations, 0),
        0,
      );
      return {
        id: wp.id,
        name: wp.name,
        description: wp.description,
        type: (wp as unknown as { type?: string }).type ?? "create",
        routeCount: wp._count.briefings,
        generationCount: totalGenerations,
        routes: wp.briefings.map((b) => {
          const routeGens = b.sessions.reduce(
            (s, sess) => s + sess._count.generations,
            0,
          );
          return {
            id: b.id,
            name: b.name,
            description: b.description,
            updatedAt: b.updatedAt.toISOString(),
            waypointCount: b._count.sessions,
            generationCount: routeGens,
            thumbnails: thumbnailsByProjectId.get(b.id) ?? [],
          };
        }),
      };
    });
    // #region agent log
    void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H5',location:'lib/prefetch/dashboard.ts:done',message:'prefetchDashboard finished',data:{elapsedMs:Date.now()-prefetchStart,journeyCount:journeys.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return { data: { journeys }, isAdmin };
  } catch (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId,hypothesisId:'H5',location:'lib/prefetch/dashboard.ts:catch',message:'prefetchDashboard failed',data:{elapsedMs:Date.now()-prefetchStart,error:error instanceof Error?error.message:'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return null;
  }
}
