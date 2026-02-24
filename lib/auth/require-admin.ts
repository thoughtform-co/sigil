import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import type { AuthedUser } from "@/lib/auth/server";
import { unauthorized, forbidden } from "@/lib/api/errors";

export type RequireAdminResult = { user: AuthedUser } | { error: NextResponse };

/**
 * Use in admin API routes: returns either the authed admin user or an error response.
 * Example: const result = await requireAdmin(); if ("error" in result) return result.error;
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const user = await getAuthedUser();
  if (!user) return { error: unauthorized() };

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "admin") {
    return { error: forbidden() };
  }

  return { user };
}
