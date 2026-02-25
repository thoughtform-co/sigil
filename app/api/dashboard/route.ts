import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

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

  // Accessible project IDs: owned, direct member, or via workspace membership
  const wpMemberships = await prisma.workspaceProjectMember.findMany({
    where: { userId: user.id },
    select: { workspaceProjectId: true },
  });
  const wpIds = wpMemberships.map((m) => m.workspaceProjectId);
  const accessibleProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
        ...(wpIds.length > 0 ? [{ workspaceProjectId: { in: wpIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const projectIds = accessibleProjects.map((p) => p.id);

  // Gallery: recent outputs from accessible projects (latest 30)
  const galleryOutputs =
    projectIds.length === 0
      ? []
      : await prisma.output.findMany({
          where: {
            generation: {
              session: { projectId: { in: projectIds } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            fileUrl: true,
            fileType: true,
            width: true,
            height: true,
            createdAt: true,
            generation: {
              select: {
                prompt: true,
                modelId: true,
                session: {
                  select: {
                    name: true,
                    project: { select: { name: true } },
                  },
                },
              },
            },
          },
        });

  const gallery = galleryOutputs.map((o) => ({
    id: o.id,
    fileUrl: o.fileUrl,
    fileType: o.fileType,
    width: o.width,
    height: o.height,
    createdAt: o.createdAt,
    prompt: o.generation.prompt,
    modelId: o.generation.modelId,
    sessionName: o.generation.session.name,
    projectName: o.generation.session.project.name,
  }));

  // Journeys: for user = those they're member of; for admin = all
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

  // Per-route thumbnails: last 8 outputs per briefing (project)
  const briefingIds = workspaceProjects.flatMap((wp) => wp.briefings.map((b) => b.id));
  const routeOutputs =
    briefingIds.length === 0
      ? []
      : await prisma.output.findMany({
          where: {
            generation: {
              session: { projectId: { in: briefingIds } },
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileUrl: true,
            fileType: true,
            width: true,
            height: true,
            generation: {
              select: {
                session: { select: { projectId: true } },
              },
            },
          },
        });

  // Group by projectId, keep last 8 per route (outputs are already desc by createdAt)
  const thumbnailsByProjectId = new Map<string, { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[]>();
  for (const o of routeOutputs) {
    const projectId = o.generation.session.projectId;
    const list = thumbnailsByProjectId.get(projectId) ?? [];
    if (list.length < 8) {
      list.push({
        id: o.id,
        fileUrl: o.fileUrl,
        fileType: o.fileType,
        width: o.width,
        height: o.height,
      });
      thumbnailsByProjectId.set(projectId, list);
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

  // Admin stats: per-user image and video output counts
  let adminStats: { displayName: string; imageCount: number; videoCount: number }[] = [];
  if (isAdmin) {
    const outputsWithUser = await prisma.output.findMany({
      where: {
        OR: [
          { fileType: { startsWith: "image" } },
          { fileType: { startsWith: "video" } },
        ],
      },
      select: {
        fileType: true,
        generation: { select: { userId: true } },
      },
    });
    const userCounts = new Map<
      string,
      { imageCount: number; videoCount: number }
    >();
    for (const o of outputsWithUser) {
      const uid = o.generation.userId;
      if (!userCounts.has(uid))
        userCounts.set(uid, { imageCount: 0, videoCount: 0 });
      const c = userCounts.get(uid)!;
      if (o.fileType.startsWith("image")) c.imageCount++;
      else if (o.fileType.startsWith("video")) c.videoCount++;
    }
    const profileIds = Array.from(userCounts.keys());
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, displayName: true, username: true },
    });
    adminStats = profiles.map((p) => {
      const c = userCounts.get(p.id) ?? { imageCount: 0, videoCount: 0 };
      return {
        displayName: p.displayName || p.username || p.id.slice(0, 8),
        imageCount: c.imageCount,
        videoCount: c.videoCount,
      };
    });
    adminStats.sort(
      (a, b) =>
        b.imageCount + b.videoCount - (a.imageCount + a.videoCount)
    );
  }

  return NextResponse.json({
    gallery,
    journeys,
    adminStats: isAdmin ? adminStats : undefined,
  });
}
