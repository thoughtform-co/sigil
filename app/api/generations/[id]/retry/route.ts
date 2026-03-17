import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { getProcessor } from "@/lib/models/processor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const accessFilter = await projectAccessFilter(user.id);
  const generation = await prisma.generation.findFirst({
    where: { id, session: { project: accessFilter } },
    select: { id: true, status: true },
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation not found or access denied" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.output.deleteMany({ where: { generationId: id } });
    await tx.generation.update({
      where: { id },
      data: {
        status: "processing",
        cost: null,
        errorMessage: null,
        errorCategory: null,
        errorRetryable: null,
        lastHeartbeatAt: new Date(),
      },
    });
  });

  const baseUrl = new URL(request.url).origin;
  void getProcessor().enqueue(id, baseUrl, {
    cookie: request.headers.get("cookie"),
  });

  return NextResponse.json({ id, status: "processing", retried: true });
}
