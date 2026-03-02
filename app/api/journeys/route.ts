import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const THUMBNAILS_PER_JOURNEY = 6;

export async function GET() {
  const t0 = Date.now();
  try {
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
      include: {
        _count: { select: { briefings: true } },
        briefings: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            _count: { select: { sessions: true } },
            sessions: { select: { id: true } },
          },
        },
      },
    });
    const afterWorkspace = Date.now();

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
    let generationCount = 0;
    if (sessionIdToWpId.size > 0) {
      const sessionIds = Array.from(sessionIdToWpId.keys());
      const generationTake = Math.min(
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
      generationCount = recentGenerations.length;

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
    const afterOutputs = Date.now();

    const thumbnailsByWpId = new Map<
      string,
      { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]
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

    const journeys = workspaceProjects.map((wp) => ({
      id: wp.id,
      name: wp.name,
      description: wp.description,
      type: (wp as unknown as { type?: string }).type ?? "create",
      routeCount: wp._count.briefings,
      generationCount: 0,
      routes: wp.briefings.map((b) => ({
        id: b.id,
        name: b.name,
        updatedAt: b.updatedAt,
        waypointCount: b._count.sessions,
      })),
      thumbnails: thumbnailsByWpId.get(wp.id) ?? [],
    }));

    const response = NextResponse.json({ journeys });
    const total = Date.now() - t0;
    response.headers.set(
      "Server-Timing",
      `auth;dur=${afterAuth - t0},workspace;dur=${afterWorkspace - afterAuth},outputs;dur=${afterOutputs - afterWorkspace},total;dur=${total}`,
    );
    return withCacheHeaders(response, "private-short");
  } catch {
    return NextResponse.json({ error: "Journeys API failed" }, { status: 500 });
  }
}
