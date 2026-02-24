import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/generations/[id]
 * Permanently removes a failed generation (and its outputs). Only allowed for failed generations.
 */
export async function DELETE(request: Request, context: RouteContext) {
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

  if (generation.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed generations can be dismissed" },
      { status: 400 },
    );
  }

  await prisma.generation.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
}
