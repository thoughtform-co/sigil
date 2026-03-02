import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, username: true, displayName: true },
  });

  if (!profile) {
    await prisma.profile.create({
      data: {
        id: user.id,
        username: user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`,
        displayName: user.email ?? "Sigil User",
      },
    });
    const created = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, username: true, displayName: true },
    });
    return NextResponse.json({ user: { id: user.id, email: user.email }, profile: created });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
  });
}
