import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const isAdmin = profile?.role === "admin";

  const journey = await prisma.workspaceProject.findUnique({
    where: { id },
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
  });

  if (!journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  if (!isAdmin) {
    const membership = await prisma.workspaceProjectMember.findUnique({
      where: {
        workspaceProjectId_userId: { workspaceProjectId: id, userId: user.id },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const routes = journey.briefings.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    updatedAt: b.updatedAt,
    waypointCount: b._count.sessions,
  }));

  const briefingIds = journey.briefings.map((b) => b.id);
  const thumbnailByProjectId = new Map<string, string>();
  if (briefingIds.length > 0) {
    const latestOutputs = await prisma.output.findMany({
      where: {
        generation: {
          session: {
            projectId: { in: briefingIds },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: briefingIds.length * 10,
      select: {
        fileUrl: true,
        generation: {
          select: {
            session: { select: { projectId: true } },
          },
        },
      },
    });
    for (const o of latestOutputs) {
      const projectId = o.generation.session.projectId;
      if (!thumbnailByProjectId.has(projectId)) {
        thumbnailByProjectId.set(projectId, o.fileUrl);
      }
    }
  }

  const routesWithThumbnails = routes.map((r) => ({
    ...r,
    thumbnailUrl: thumbnailByProjectId.get(r.id) ?? null,
  }));

  return NextResponse.json({
    journey: {
      id: journey.id,
      name: journey.name,
      description: journey.description,
      type: (journey as unknown as { type?: string }).type ?? "create",
      routeCount: journey.briefings.length,
      routes: routesWithThumbnails,
    },
  });
}
