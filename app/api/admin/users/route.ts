import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const [profiles, authResponse] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isDisabled: true,
        createdAt: true,
        workspaceProjectMembers: {
          select: {
            workspaceProject: { select: { id: true, name: true } },
            role: true,
          },
        },
        _count: { select: { generations: true, projects: true } },
      },
    }),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map<string, string>();
  if (authResponse.data?.users) {
    for (const u of authResponse.data.users) {
      if (u.email) emailById.set(u.id, u.email);
    }
  }

  const users = profiles.map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
  }));

  return json({ users });
}
