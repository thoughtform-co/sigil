import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

const updateOutputSchema = z.object({
  isApproved: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateOutputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patchAccessFilter = await projectAccessFilter(user.id);
  const output = await prisma.output.findFirst({
    where: { id, generation: { session: { project: patchAccessFilter } } },
    select: { id: true },
  });

  if (!output) {
    return NextResponse.json({ error: "Output not found or access denied" }, { status: 404 });
  }

  const updated = await prisma.output.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      fileUrl: true,
      fileType: true,
      isApproved: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ output: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const delAccessFilter = await projectAccessFilter(user.id);
  const output = await prisma.output.findFirst({
    where: { id, generation: { session: { project: delAccessFilter } } },
    select: { id: true },
  });

  if (!output) {
    return NextResponse.json({ error: "Output not found or access denied" }, { status: 404 });
  }

  await prisma.output.delete({ where: { id } });
  return NextResponse.json({ deleted: true, id });
}
