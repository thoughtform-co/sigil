import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";
import { badRequest } from "@/lib/api/errors";

const bulkInviteSchema = z.object({
  action: z.literal("invite"),
  emails: z.array(z.string().email()).min(1).max(50),
  workspaceProjectId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  /** When true with workspaceProjectId, set profile workshop lock to that journey. */
  lockToJourney: z.boolean().optional(),
});

const bulkRemoveSchema = z.object({
  action: z.literal("remove"),
  userIds: z.array(z.string().uuid()).min(1).max(50),
  workspaceProjectId: z.string().uuid(),
});

const bulkDisableSchema = z.object({
  action: z.literal("disable"),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

const bulkAssignSchema = z.object({
  action: z.literal("assign"),
  userIds: z.array(z.string().uuid()).min(1).max(50),
  workspaceProjectId: z.string().uuid(),
  lockToJourney: z.boolean().optional(),
});

const bulkUnlockSchema = z.object({
  action: z.literal("unlock"),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

const bulkSchema = z.discriminatedUnion("action", [
  bulkInviteSchema,
  bulkRemoveSchema,
  bulkDisableSchema,
  bulkAssignSchema,
  bulkUnlockSchema,
]);

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { user: adminUser } = result;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const data = parsed.data;

  if (data.action === "invite") {
    return handleBulkInvite(data, adminUser.id);
  }

  if (data.action === "remove") {
    return handleBulkRemove(data);
  }

  if (data.action === "assign") {
    return handleBulkAssign(data);
  }

  if (data.action === "unlock") {
    return handleBulkUnlock(data);
  }

  return handleBulkDisable(data);
}

async function setWorkshopLockForUsers(userIds: string[], workspaceProjectId: string) {
  await prisma.profile.updateMany({
    where: {
      id: { in: userIds },
      role: "user",
    },
    data: { lockedWorkspaceProjectId: workspaceProjectId },
  });
}

async function clearWorkshopLockForUsers(userIds: string[], workspaceProjectId: string) {
  await prisma.profile.updateMany({
    where: {
      id: { in: userIds },
      lockedWorkspaceProjectId: workspaceProjectId,
    },
    data: { lockedWorkspaceProjectId: null },
  });
}

async function handleBulkInvite(
  data: z.infer<typeof bulkInviteSchema>,
  adminId: string,
) {
  const supabaseAdmin = createAdminClient();
  const results: Array<{ email: string; status: "created" | "exists" | "error"; userId?: string; error?: string }> = [];
  const listOnce = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const listedUsers = listOnce.data?.users ?? [];

  for (const email of data.emails) {
    try {
      const existingUser = listedUsers.find((u) => u.email?.toLowerCase() === email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email, status: "exists", userId });
      } else {
        const tempPassword = crypto.randomUUID();
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });
        if (error || !created.user) {
          results.push({ email, status: "error", error: error?.message ?? "Unknown error" });
          continue;
        }
        userId = created.user.id;
        results.push({ email, status: "created", userId });
      }

      await prisma.profile.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          username: email.split("@")[0],
          displayName: email.split("@")[0],
        },
      });

      await prisma.allowedEmail.upsert({
        where: { email },
        update: {},
        create: { email, note: data.note ?? null, addedBy: adminId },
      });

      if (data.workspaceProjectId) {
        await prisma.workspaceProjectMember.upsert({
          where: {
            workspaceProjectId_userId: {
              workspaceProjectId: data.workspaceProjectId,
              userId,
            },
          },
          update: {},
          create: { workspaceProjectId: data.workspaceProjectId, userId },
        });
        if (data.lockToJourney) {
          await setWorkshopLockForUsers([userId], data.workspaceProjectId);
        }
      }
    } catch (err) {
      results.push({
        email,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return json({ results }, 201);
}

async function handleBulkRemove(data: z.infer<typeof bulkRemoveSchema>) {
  const removed: string[] = [];

  for (const userId of data.userIds) {
    await prisma.workspaceProjectMember.deleteMany({
      where: { workspaceProjectId: data.workspaceProjectId, userId },
    });
    await clearWorkshopLockForUsers([userId], data.workspaceProjectId);
    removed.push(userId);
  }

  return json({ removed });
}

async function handleBulkAssign(data: z.infer<typeof bulkAssignSchema>) {
  const assigned: string[] = [];

  for (const userId of data.userIds) {
    await prisma.workspaceProjectMember.upsert({
      where: {
        workspaceProjectId_userId: {
          workspaceProjectId: data.workspaceProjectId,
          userId,
        },
      },
      update: {},
      create: { workspaceProjectId: data.workspaceProjectId, userId },
    });
    assigned.push(userId);
  }

  if (data.lockToJourney) {
    await setWorkshopLockForUsers(data.userIds, data.workspaceProjectId);
  }

  return json({ assigned });
}

async function handleBulkUnlock(data: z.infer<typeof bulkUnlockSchema>) {
  await prisma.profile.updateMany({
    where: { id: { in: data.userIds }, role: "user" },
    data: { lockedWorkspaceProjectId: null },
  });
  return json({ unlocked: data.userIds.length });
}

async function handleBulkDisable(data: z.infer<typeof bulkDisableSchema>) {
  const supabaseAdmin = createAdminClient();
  const results: Array<{ userId: string; status: "disabled" | "error"; error?: string }> = [];

  for (const userId of data.userIds) {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

      if (error) {
        results.push({ userId, status: "error", error: error.message });
        continue;
      }

      await prisma.profile.update({
        where: { id: userId },
        data: { isDisabled: true },
      });

      results.push({ userId, status: "disabled" });
    } catch (err) {
      results.push({
        userId,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return json({ results });
}
