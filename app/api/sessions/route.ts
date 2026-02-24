import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const createSessionSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["image", "video"]),
});

export async function GET(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const sessionsRaw = await prisma.session.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      updatedAt: true,
      generations: {
        where: {
          outputs: { some: {} },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          outputs: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { fileUrl: true },
          },
        },
      },
    },
  });

  const sessions = sessionsRaw.map((session) => ({
    id: session.id,
    name: session.name,
    type: session.type,
    updatedAt: session.updatedAt,
    thumbnailUrl: session.generations[0]?.outputs[0]?.fileUrl ?? null,
  }));

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const session = await prisma.session.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      type: parsed.data.type,
    },
    select: { id: true, name: true, type: true, updatedAt: true },
  });

  return NextResponse.json({ session }, { status: 201 });
}
