import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workspaceProjectId: z.string().uuid().optional(),
});

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessWhere = await projectAccessFilter(user.id);

  const projects = await prisma.project.findMany({
    where: accessWhere,
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      workspaceProjectId: true,
    },
  });

  return withCacheHeaders(NextResponse.json({ projects }), "private-short");
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, lockedWorkspaceProjectId: true },
  });
  const isAdmin = profile?.role === "admin";
  const wpId = parsed.data.workspaceProjectId;

  if (!isAdmin && profile?.lockedWorkspaceProjectId) {
    if (!wpId || wpId !== profile.lockedWorkspaceProjectId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!isAdmin && wpId) {
    const membership = await prisma.workspaceProjectMember.findUnique({
      where: {
        workspaceProjectId_userId: { workspaceProjectId: wpId, userId: user.id },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      ownerId: user.id,
      workspaceProjectId: parsed.data.workspaceProjectId,
    },
    select: { id: true, name: true, description: true, updatedAt: true, workspaceProjectId: true },
  });

  const session = await prisma.session.create({
    data: {
      projectId: project.id,
      name: "Main Session",
      type: "image",
    },
    select: { id: true, name: true, type: true },
  });

  return NextResponse.json({ project, initialSession: session }, { status: 201 });
}
