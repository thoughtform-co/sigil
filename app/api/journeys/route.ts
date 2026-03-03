import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";

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
            updatedAt: true,
            _count: { select: { sessions: true } },
          },
        },
      },
    });
    const afterWorkspace = Date.now();

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
        updatedAt: b.updatedAt,
        waypointCount: b._count.sessions,
      })),
      thumbnails: [],
    }));

    const response = NextResponse.json({ journeys });
    const total = Date.now() - t0;
    response.headers.set(
      "Server-Timing",
      `auth;dur=${afterAuth - t0},workspace;dur=${afterWorkspace - afterAuth},total;dur=${total}`,
    );
    return withCacheHeaders(response, "private-short");
  } catch {
    return NextResponse.json({ error: "Journeys API failed" }, { status: 500 });
  }
}
