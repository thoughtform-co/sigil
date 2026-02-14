import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, description: true, updatedAt: true },
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ deleted: true, id });
}
