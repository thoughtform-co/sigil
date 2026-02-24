import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const defaultGraphData: Prisma.InputJsonValue = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

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

  const workflows = await prisma.workflow.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      graphData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ workflows });
}

const createWorkflowSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkflowSchema.safeParse(body);
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

  const name = parsed.data.name ?? `Workflow ${new Date().toLocaleDateString()}`;
  const workflow = await prisma.workflow.create({
    data: {
      projectId: project.id,
      name,
      graphData: defaultGraphData,
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

  return NextResponse.json({ workflow }, { status: 201 });
}
