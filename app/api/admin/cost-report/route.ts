import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

export async function GET(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(request.url);
  const workspaceProjectId = searchParams.get("workspaceProjectId");

  const userFilter = workspaceProjectId
    ? {
        workspaceProjectMembers: {
          some: { workspaceProjectId },
        },
      }
    : {};

  const users = await prisma.profile.findMany({
    where: userFilter,
    select: {
      id: true,
      displayName: true,
      username: true,
      isDisabled: true,
      generations: {
        select: { cost: true, modelId: true, createdAt: true },
      },
      workspaceProjectMembers: {
        select: {
          workspaceProject: { select: { id: true, name: true } },
        },
      },
    },
  });

  const perUser = users.map((u) => {
    let lifetimeCost = 0;
    const modelBreakdown: Record<string, { count: number; cost: number }> = {};

    for (const gen of u.generations) {
      const cost = Number(gen.cost ?? 0);
      lifetimeCost += cost;
      const entry = modelBreakdown[gen.modelId] ??= { count: 0, cost: 0 };
      entry.count += 1;
      entry.cost += cost;
    }

    return {
      userId: u.id,
      displayName: u.displayName,
      username: u.username,
      isDisabled: u.isDisabled,
      workspaceProjects: u.workspaceProjectMembers.map((m) => m.workspaceProject),
      lifetimeCost: Number(lifetimeCost.toFixed(6)),
      totalGenerations: u.generations.length,
      modelBreakdown,
    };
  });

  perUser.sort((a, b) => b.lifetimeCost - a.lifetimeCost);

  const workspaceBreakdown: Record<string, { name: string; totalCost: number; userCount: number; generationCount: number }> = {};

  if (workspaceProjectId) {
    const wpName = users[0]?.workspaceProjectMembers.find(
      (m) => m.workspaceProject.id === workspaceProjectId,
    )?.workspaceProject.name ?? "Unknown";

    workspaceBreakdown[workspaceProjectId] = {
      name: wpName,
      totalCost: Number(perUser.reduce((sum, u) => sum + u.lifetimeCost, 0).toFixed(6)),
      userCount: perUser.length,
      generationCount: perUser.reduce((sum, u) => sum + u.totalGenerations, 0),
    };
  } else {
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
  }

  const grandTotal = perUser.reduce((sum, u) => sum + u.lifetimeCost, 0);

  return json({
    grandTotalCost: Number(grandTotal.toFixed(6)),
    grandTotalGenerations: perUser.reduce((sum, u) => sum + u.totalGenerations, 0),
    perUser,
    workspaceBreakdown,
  });
}
