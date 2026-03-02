import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/components/dashboard/DashboardView";

const THUMBS_PER_ROUTE = 8;

export async function prefetchDashboard(
  userId: string,
): Promise<{ data: DashboardData; isAdmin: boolean } | null> {
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
              select: { _count: { select: { generations: true } } },
            },
          },
        },
      },
    });

    const briefingIds = workspaceProjects.flatMap((wp) =>
      wp.briefings.map((b) => b.id),
    );

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

    if (briefingIds.length > 0) {
      const recentOutputs = await prisma.output.findMany({
        where: {
          generation: { session: { projectId: { in: briefingIds } } },
        },
        orderBy: { createdAt: "desc" },
        take: briefingIds.length * THUMBS_PER_ROUTE,
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          width: true,
          height: true,
          generation: {
            select: {
              sessionId: true,
              session: { select: { projectId: true } },
            },
          },
        },
      });

      for (const o of recentOutputs) {
        const pid = o.generation.session.projectId;
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
            sessionId: o.generation.sessionId,
          });
        }
      }
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

    return { data: { journeys }, isAdmin };
  } catch {
    return null;
  }
}
