import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const afterWorkspace = Date.now();

  const briefingIds = workspaceProjects.flatMap((wp) => wp.briefings.map((b) => b.id));
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
    { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null; sessionId: string }[]
  >();

  if (sessionIdToProjectId.size > 0) {
    const sessionIds = Array.from(sessionIdToProjectId.keys());
    const generationTake = Math.min(
      Math.max(briefingIds.length * THUMBS_PER_ROUTE * 4, 32),
      1000,
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

    for (const o of sortedOutputs) {
      const sessionId = generationIdToSessionId.get(o.generationId);
      if (!sessionId) continue;
      const pid = sessionIdToProjectId.get(sessionId);
      if (!pid) continue;
      let list = thumbnailsByProjectId.get(pid);
      if (!list) {
        list = [];
        thumbnailsByProjectId.set(pid, list);
      }
      if (list.length < THUMBS_PER_ROUTE) {
        list.push({
          id: o.id,
          fileUrl: o.fileUrl,
          fileType: o.fileType,
          width: o.width,
          height: o.height,
          sessionId,
        });
        if (list.length >= THUMBS_PER_ROUTE) {
          pendingProjectIds.delete(pid);
          if (pendingProjectIds.size === 0) break;
        }
      }
    }
  }
  const afterThumbnails = Date.now();

  const journeys = workspaceProjects.map((wp) => {
    const totalGenerations = wp.briefings.reduce(
      (sum, b) =>
        sum +
        b.sessions.reduce(
          (s, sess) => s + sess._count.generations,
          0
        ),
      0
    );
    return {
      id: wp.id,
      name: wp.name,
      description: wp.description,
      type: (wp as unknown as { type?: string }).type ?? "create",
      routeCount: wp._count.briefings,
      generationCount: totalGenerations,
      routes: wp.briefings.map((b) => {
        const routeGenerationCount = b.sessions.reduce(
          (s, sess) => s + sess._count.generations,
          0
        );
        return {
          id: b.id,
          name: b.name,
          description: b.description,
          updatedAt: b.updatedAt,
          waypointCount: b._count.sessions,
          generationCount: routeGenerationCount,
          thumbnails: thumbnailsByProjectId.get(b.id) ?? [],
        };
      }),
    };
  });

  const response = NextResponse.json({
    journeys,
  });
  const total = Date.now() - start;
  response.headers.set(
    "Server-Timing",
    `auth;dur=${afterAuth - start},workspace;dur=${afterWorkspace - afterAuth},thumbnails;dur=${afterThumbnails - afterWorkspace},total;dur=${total}`
  );
  if (process.env.NODE_ENV === "development") {
    console.log(`[dashboard] auth=${afterAuth - start}ms workspace=${afterWorkspace - afterAuth}ms thumbnails=${afterThumbnails - afterWorkspace}ms total=${total}ms`);
  }
  return withCacheHeaders(response, "private-short");
}
