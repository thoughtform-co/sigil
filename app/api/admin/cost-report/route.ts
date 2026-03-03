import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonWithTiming } from "@/lib/api/responses";

export async function GET(request: Request) {
  const t0 = performance.now();
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const workspaceProjectId = searchParams.get("workspaceProjectId");

  const wpFilter = workspaceProjectId
    ? Prisma.sql`AND wpm.workspace_project_id = ${workspaceProjectId}::uuid`
    : Prisma.empty;

  const costRows = await prisma.$queryRaw<
    { user_id: string; model_id: string; gen_count: bigint; total_cost: number }[]
  >`
    SELECT g.user_id, g.model_id,
           COUNT(*)::bigint AS gen_count,
           COALESCE(SUM(g.cost), 0)::float AS total_cost
    FROM generations g
    INNER JOIN profiles p ON p.id = g.user_id
    WHERE EXISTS (
      SELECT 1 FROM workspace_project_members wpm
      WHERE wpm.user_id = g.user_id ${wpFilter}
    )
    GROUP BY g.user_id, g.model_id
  `;

  const profileFilter = workspaceProjectId
    ? { workspaceProjectMembers: { some: { workspaceProjectId } } }
    : {};

  const profiles = await prisma.profile.findMany({
    where: profileFilter,
    select: {
      id: true,
      displayName: true,
      username: true,
      isDisabled: true,
      workspaceProjectMembers: {
        select: { workspaceProject: { select: { id: true, name: true } } },
      },
    },
    take: 500,
  });

  type UserEntry = {
    userId: string;
    displayName: string | null;
    username: string | null;
    isDisabled: boolean;
    workspaceProjects: { id: string; name: string }[];
    lifetimeCost: number;
    totalGenerations: number;
    modelBreakdown: Record<string, { count: number; cost: number }>;
  };

  const userMap = new Map<string, UserEntry>();
  for (const p of profiles) {
    userMap.set(p.id, {
      userId: p.id,
      displayName: p.displayName,
      username: p.username,
      isDisabled: p.isDisabled,
      workspaceProjects: p.workspaceProjectMembers.map((m) => m.workspaceProject),
      lifetimeCost: 0,
      totalGenerations: 0,
      modelBreakdown: {},
    });
  }

  for (const row of costRows) {
    const entry = userMap.get(row.user_id);
    if (!entry) continue;
    const count = Number(row.gen_count);
    const cost = Number(row.total_cost);
    entry.lifetimeCost += cost;
    entry.totalGenerations += count;
    entry.modelBreakdown[row.model_id] = { count, cost: Number(cost.toFixed(6)) };
  }

  const perUser = Array.from(userMap.values()).map((u) => ({
    ...u,
    lifetimeCost: Number(u.lifetimeCost.toFixed(6)),
  }));
  perUser.sort((a, b) => b.lifetimeCost - a.lifetimeCost);

  const workspaceBreakdown: Record<string, { name: string; totalCost: number; userCount: number; generationCount: number }> = {};
  for (const u of perUser) {
    for (const wp of u.workspaceProjects) {
      const entry = workspaceBreakdown[wp.id] ??= { name: wp.name, totalCost: 0, userCount: 0, generationCount: 0 };
      entry.totalCost += u.lifetimeCost;
      entry.userCount += 1;
      entry.generationCount += u.totalGenerations;
    }
  }
  for (const key of Object.keys(workspaceBreakdown)) {
    workspaceBreakdown[key].totalCost = Number(workspaceBreakdown[key].totalCost.toFixed(6));
  }

  const grandTotal = perUser.reduce((sum, u) => sum + u.lifetimeCost, 0);

  return jsonWithTiming({
    grandTotalCost: Number(grandTotal.toFixed(6)),
    grandTotalGenerations: perUser.reduce((sum, u) => sum + u.totalGenerations, 0),
    perUser,
    workspaceBreakdown,
  }, { total: performance.now() - t0 });
}
