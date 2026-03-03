import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";
import { withCacheHeaders } from "@/lib/api/cache-headers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    const accessFilter = await projectAccessFilter(user.id);
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...accessFilter },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const rows = await prisma.$queryRaw<
    { source_output_id: string; count: bigint; has_processing: boolean }[]
  >(Prisma.sql`
    SELECT
      COALESCE(
        g.parameters->>'sourceOutputId',
        g.parameters->>'referenceImageId'
      ) AS source_output_id,
      COUNT(*)::bigint AS count,
      BOOL_OR(g.status IN ('processing', 'processing_locked')) AS has_processing
    FROM generations g
    JOIN sessions s ON s.id = g.session_id
    WHERE s.project_id = ${projectId}::uuid
      AND s.type = 'video'
      AND (g.parameters->>'sourceOutputId' IS NOT NULL
           OR g.parameters->>'referenceImageId' IS NOT NULL)
    GROUP BY source_output_id
  `);

  const counts: Record<string, { count: number; hasProcessing: boolean }> = {};
  for (const row of rows) {
    counts[row.source_output_id] = {
      count: Number(row.count),
      hasProcessing: row.has_processing,
    };
  }

  const response = NextResponse.json({ counts });
  return withCacheHeaders(response, "private-short");
}
