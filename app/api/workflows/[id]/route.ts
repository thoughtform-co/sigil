import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      graphData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found or access denied" }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  graphData: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.workflow.findFirst({
    where: {
      id,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Workflow not found or access denied" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Prisma.WorkflowUpdateInput = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.graphData !== undefined) updateData.graphData = parsed.data.graphData as Prisma.InputJsonValue;

  const workflow = await prisma.workflow.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      graphData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ workflow });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.workflow.findFirst({
    where: {
      id,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Workflow not found or access denied" }, { status: 404 });
  }

  await prisma.workflow.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
