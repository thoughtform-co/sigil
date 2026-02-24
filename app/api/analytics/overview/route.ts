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
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessFilter = await projectAccessFilter(user.id);

  const recentGenerations = await prisma.generation.findMany({
    where: {
      createdAt: { gte: daysAgo(30) },
      session: { project: accessFilter },
    },
    select: {
      id: true,
      status: true,
      modelId: true,
      cost: true,
      createdAt: true,
      outputs: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const statusCounts: Record<string, number> = {};
  const modelCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  let totalCost = 0;
  let outputCount = 0;

  for (const generation of recentGenerations) {
    statusCounts[generation.status] = (statusCounts[generation.status] ?? 0) + 1;
    modelCounts[generation.modelId] = (modelCounts[generation.modelId] ?? 0) + 1;
    outputCount += generation.outputs.length;
    totalCost += Number(generation.cost ?? 0);
    const dayKey = generation.createdAt.toISOString().slice(0, 10);
    dailyCounts[dayKey] = (dailyCounts[dayKey] ?? 0) + 1;
  }

  const topModels = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([modelId, count]) => ({ modelId, count }));

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const day = daysAgo(6 - index).toISOString().slice(0, 10);
    return {
      day,
      count: dailyCounts[day] ?? 0,
    };
  });

  return NextResponse.json({
    totals: {
      generations30d: recentGenerations.length,
      outputs30d: outputCount,
      estimatedCost30d: Number(totalCost.toFixed(4)),
    },
    statusCounts,
    topModels,
    last7Days,
  });
}
