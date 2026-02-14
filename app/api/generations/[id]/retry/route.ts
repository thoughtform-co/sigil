import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const generation = await prisma.generation.findFirst({
    where: {
      id,
      session: {
        project: {
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
      },
    },
    select: { id: true, status: true },
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation not found or access denied" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.output.deleteMany({ where: { generationId: id } });
    await tx.generation.update({
      where: { id },
      data: { status: "processing", cost: null },
    });
  });

  const processUrl = new URL("/api/generate/process", request.url);
  void fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId: id }),
    cache: "no-store",
  }).catch(() => {
    // If the handoff fails, generation remains in processing and can be retried again.
  });

  return NextResponse.json({ id, status: "processing", retried: true });
}
