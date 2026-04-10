/**
 * Reusable access-provisioning helpers for workshop registrants.
 *
 * Extracted from the admin bulk invite flow so that a future
 * "paid" or "approved" transition can grant Sigil access without
 * reimplementing the AllowedEmail + Profile + membership + magic-link chain.
 *
 * This module is the seam between the registration domain and
 * the Sigil auth/access system.
 */

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkEmail } from "@/lib/auth/magic-link";
import { buildAuthCallbackUrl, getInviteDestinationPath } from "@/lib/auth/redirect-target";

export interface ProvisionAccessInput {
  email: string;
  name: string;
  workspaceProjectId?: string;
  lockToJourney?: boolean;
  origin: string;
}

export interface ProvisionAccessResult {
  email: string;
  userId: string;
  status: "created" | "exists";
  magicLinkSent: boolean;
  error?: string;
}

/**
 * Provision Sigil platform access for a registrant:
 * 1. Create or find Supabase auth user
 * 2. Upsert Profile row
 * 3. Add to AllowedEmail
 * 4. (Optional) Add WorkspaceProjectMember + workshop lock
 * 5. Send magic-link email
 */
export async function provisionAccess(input: ProvisionAccessInput): Promise<ProvisionAccessResult> {
  const supabaseAdmin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const listOnce = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const listedUsers = listOnce.data?.users ?? [];
  const existingUser = listedUsers.find((u) => u.email?.toLowerCase() === email);

  let userId: string;
  let status: "created" | "exists";

  if (existingUser) {
    userId = existingUser.id;
    status = "exists";
  } else {
    const tempPassword = crypto.randomUUID();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { email, userId: "", status: "created", magicLinkSent: false, error: error?.message ?? "User creation failed" };
    }
    userId = created.user.id;
    status = "created";
  }

  await prisma.profile.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      username: email.split("@")[0],
      displayName: input.name,
    },
  });

  await prisma.allowedEmail.upsert({
    where: { email },
    update: {},
    create: { email, note: "Workshop registration", addedBy: userId },
  });

  if (input.workspaceProjectId) {
    await prisma.workspaceProjectMember.upsert({
      where: {
        workspaceProjectId_userId: {
          workspaceProjectId: input.workspaceProjectId,
          userId,
        },
      },
      update: {},
      create: { workspaceProjectId: input.workspaceProjectId, userId },
    });

    if (input.lockToJourney) {
      await prisma.profile.updateMany({
        where: { id: userId, role: "user" },
        data: { lockedWorkspaceProjectId: input.workspaceProjectId },
      });
    }
  }

  const inviteDestination = getInviteDestinationPath(input.workspaceProjectId);
  const emailRedirectTo = buildAuthCallbackUrl(input.origin, inviteDestination);

  const { error: magicLinkError } = await sendMagicLinkEmail({
    email,
    emailRedirectTo,
  });

  if (magicLinkError) {
    return {
      email,
      userId,
      status,
      magicLinkSent: false,
      error: `Access provisioned but magic-link email failed: ${magicLinkError.message}`,
    };
  }

  return { email, userId, status, magicLinkSent: true };
}

/**
 * Grant access to a workshop registrant by registration ID.
 * Looks up the registration, resolves the linked event's journey,
 * and provisions access.
 */
export async function grantAccessForRegistration(
  registrationId: string,
  origin: string,
  opts?: { lockToJourney?: boolean },
): Promise<ProvisionAccessResult> {
  const registration = await prisma.workshopRegistration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) {
    return { email: "", userId: "", status: "created", magicLinkSent: false, error: "Registration not found" };
  }

  return provisionAccess({
    email: registration.email,
    name: registration.name,
    workspaceProjectId: registration.event.workspaceProjectId ?? undefined,
    lockToJourney: opts?.lockToJourney ?? true,
    origin,
  });
}
