import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";
import { badRequest } from "@/lib/api/errors";
import { normalizeDisplayNameInput } from "@/lib/profile-name";

const updateMeSchema = z.object({
  displayName: z.string().max(60).optional(),
});

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      username: true,
      displayName: true,
      lockedWorkspaceProjectId: true,
    },
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email },
    profile:
      profile ?? {
        id: user.id,
        role: "user",
        username: null,
        displayName: null,
        lockedWorkspaceProjectId: null,
      },
  });
  return withCacheHeaders(response, "private-short");
}

export async function PATCH(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const displayName = normalizeDisplayNameInput(parsed.data.displayName);

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: { displayName },
    create: {
      id: user.id,
      username: user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`,
      displayName,
    },
    select: {
      id: true,
      role: true,
      username: true,
      displayName: true,
      lockedWorkspaceProjectId: true,
    },
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
  });
  return withCacheHeaders(response, "private-short");
}
