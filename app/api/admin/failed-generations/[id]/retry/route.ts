import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const generation = await prisma.generation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!generation) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.output.deleteMany({ where: { generationId: id } }),
    prisma.generation.update({
      where: { id },
      data: { status: "processing" },
    }),
  ]);

  const processUrl = new URL("/api/generate/process", request.url);
  void fetch(processUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generationId: id }),
    cache: "no-store",
  }).catch(() => {
    // Retry dispatch failures are reflected by stale processing status.
  });

  return NextResponse.json({ retried: true, id }, { status: 202 });
}
