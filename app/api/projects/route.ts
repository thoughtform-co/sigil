import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getAuthedUser } from "@/lib/auth/server";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
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

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      ownerId: user.id,
    },
    select: { id: true, name: true, description: true, updatedAt: true },
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
