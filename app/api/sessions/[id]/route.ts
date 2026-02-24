import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

const updateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["image", "video"]).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const accessFilter = await projectAccessFilter(user.id);
  const session = await prisma.session.findFirst({
    where: { id, project: accessFilter },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const updated = await prisma.session.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, type: true, updatedAt: true },
  });

  return NextResponse.json({ session: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const delAccessFilter = await projectAccessFilter(user.id);
  const session = await prisma.session.findFirst({
    where: { id, project: delAccessFilter },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ deleted: true, id });
}
