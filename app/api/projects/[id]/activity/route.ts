import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { withCacheHeaders } from "@/lib/api/cache-headers";

const ACTIVITY_LIMIT = 20;
const PROMPT_SNIPPET_LEN = 80;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const accessFilter = await projectAccessFilter(user.id);

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessFilter },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const generations = await prisma.generation.findMany({
    where: { session: { projectId } },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      id: true,
      prompt: true,
      status: true,
      modelId: true,
      createdAt: true,
      source: true,
      session: {
        select: { name: true, type: true },
      },
      _count: { select: { outputs: true } },
    },
  });

  const activity = generations.map((g) => ({
    id: g.id,
    prompt:
      g.prompt.length > PROMPT_SNIPPET_LEN
        ? g.prompt.slice(0, PROMPT_SNIPPET_LEN) + "\u2026"
        : g.prompt,
    status: g.status,
    modelId: g.modelId,
    createdAt: g.createdAt.toISOString(),
    source: g.source,
    sessionName: g.session.name,
    sessionType: g.session.type,
    outputCount: g._count.outputs,
  }));

  return withCacheHeaders(
    NextResponse.json({ activity }),
    "private-short",
  );
}
