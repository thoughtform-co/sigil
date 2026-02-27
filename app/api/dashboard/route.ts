import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";

export async function GET() {
  const start = Date.now();
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const afterAuth = Date.now();

  const [profile, wpMemberships] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    }),
    prisma.workspaceProjectMember.findMany({
      where: { userId: user.id },
      select: { workspaceProjectId: true },
    }),
  ]);
  const isAdmin = profile?.role === "admin";
  const wpIds = wpMemberships.map((m) => m.workspaceProjectId);

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
              select: { _count: { select: { generations: true } } },
            },
          },
        },
      },
  });
  const afterWorkspace = Date.now();

  const briefingIds = workspaceProjects.flatMap((wp) => wp.briefings.map((b) => b.id));

  const thumbnailResults =
    briefingIds.length === 0
      ? []
      : await Promise.all(
          briefingIds.map((projectId) =>
            prisma.output.findMany({
              where: {
                generation: {
                  session: { projectId },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 8,
              select: {
                id: true,
                fileUrl: true,
                fileType: true,
                width: true,
                height: true,
                generation: { select: { sessionId: true } },
              },
            })
          )
        );
  const afterThumbnails = Date.now();

  const thumbnailsByProjectId = new Map<
    string,
    { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null; sessionId: string }[]
  >();
  briefingIds.forEach((projectId, i) => {
    const outputs = thumbnailResults[i] ?? [];
    thumbnailsByProjectId.set(
      projectId,
      outputs.map((o) => ({
        id: o.id,
        fileUrl: o.fileUrl,
        fileType: o.fileType,
        width: o.width,
        height: o.height,
        sessionId: o.generation.sessionId,
      }))
    );
  });

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
  return withCacheHeaders(response, "short");
}
