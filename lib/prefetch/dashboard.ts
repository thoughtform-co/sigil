import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/components/dashboard/DashboardView";

export async function prefetchDashboard(
  userId: string,
  _options: { includeThumbnails?: boolean } = {},
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
        thumbnails: [],
      })),
    }));
    return { data: { journeys }, isAdmin };
  } catch {
    return null;
  }
}
