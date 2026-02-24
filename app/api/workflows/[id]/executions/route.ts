import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workflowId } = await params;
  const accessFilter = await projectAccessFilter(user.id);
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, project: accessFilter },
    select: { id: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found or access denied" }, { status: 404 });
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      userId: user.id,
      status: "running",
      startedAt: new Date(),
    },
    select: { id: true, status: true, startedAt: true },
  });

  return NextResponse.json({ execution }, { status: 201 });
}
