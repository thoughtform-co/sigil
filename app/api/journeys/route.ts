import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const THUMBNAILS_PER_JOURNEY = 6;

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          sessions: {
            select: { _count: { select: { generations: true } } },
          },
        },
      },
    },
  });

  const wpIds = workspaceProjects.map((wp) => wp.id);
  const recentOutputs =
    wpIds.length === 0
      ? []
      : await prisma.output.findMany({
    where: {
      generation: {
        session: {
          project: {
            workspaceProjectId: { in: wpIds },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      fileUrl: true,
      fileType: true,
      width: true,
      height: true,
      createdAt: true,
      generation: {
        select: {
          session: {
            select: {
              project: { select: { workspaceProjectId: true } },
            },
          },
        },
      },
    },
  });

  const thumbnailsByWpId = new Map<
    string,
    { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]
  >();
  for (const o of recentOutputs) {
    const wpId = o.generation.session.project.workspaceProjectId;
    if (!wpId) continue;
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
    }
  }

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
      routes: wp.briefings.map((b) => ({
        id: b.id,
        name: b.name,
        updatedAt: b.updatedAt,
        waypointCount: b._count.sessions,
      })),
      thumbnails: thumbnailsByWpId.get(wp.id) ?? [],
    };
  });

  return NextResponse.json({ journeys });
}
