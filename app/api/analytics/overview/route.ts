import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

function daysAgo(count: number) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
}

export async function GET() {
  const t0 = performance.now();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessFilter = await projectAccessFilter(user.id);

  const since = daysAgo(30);

  const [statusRows, modelRows, dailyRows, totalsRow] = await Promise.all([
    prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT g.status, COUNT(*)::bigint AS count
      FROM generations g
      INNER JOIN sessions s ON s.id = g.session_id
      INNER JOIN projects p ON p.id = s.project_id
      WHERE g.created_at >= ${since}
      GROUP BY g.status
    `,
    prisma.$queryRaw<{ model_id: string; count: bigint }[]>`
      SELECT g.model_id, COUNT(*)::bigint AS count
      FROM generations g
      INNER JOIN sessions s ON s.id = g.session_id
      INNER JOIN projects p ON p.id = s.project_id
      WHERE g.created_at >= ${since}
      GROUP BY g.model_id
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE(g.created_at)::text AS day, COUNT(*)::bigint AS count
      FROM generations g
      INNER JOIN sessions s ON s.id = g.session_id
      INNER JOIN projects p ON p.id = s.project_id
      WHERE g.created_at >= ${since}
      GROUP BY day
      ORDER BY day
    `,
    prisma.$queryRaw<{ gen_count: bigint; output_count: bigint; total_cost: number }[]>`
      SELECT
        COUNT(DISTINCT g.id)::bigint AS gen_count,
        COUNT(DISTINCT o.id)::bigint AS output_count,
        COALESCE(SUM(g.cost), 0)::float AS total_cost
      FROM generations g
      INNER JOIN sessions s ON s.id = g.session_id
      INNER JOIN projects p ON p.id = s.project_id
      LEFT JOIN outputs o ON o.generation_id = g.id
      WHERE g.created_at >= ${since}
    `,
  ]);

  const statusCounts: Record<string, number> = {};
  for (const r of statusRows) statusCounts[r.status] = Number(r.count);

  const topModels = modelRows.map((r) => ({ modelId: r.model_id, count: Number(r.count) }));

  const dailyMap = new Map(dailyRows.map((r) => [r.day, Number(r.count)]));
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const day = daysAgo(6 - index).toISOString().slice(0, 10);
    return { day, count: dailyMap.get(day) ?? 0 };
  });

  const t = totalsRow[0] ?? { gen_count: BigInt(0), output_count: BigInt(0), total_cost: 0 };

  const response = NextResponse.json({
    totals: {
      generations30d: Number(t.gen_count),
      outputs30d: Number(t.output_count),
      estimatedCost30d: Number(Number(t.total_cost).toFixed(4)),
    },
    statusCounts,
    topModels,
    last7Days,
  });
  response.headers.set("Server-Timing", `total;dur=${Math.round(performance.now() - t0)}`);
  return response;
}
