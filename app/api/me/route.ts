import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getAuthedUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureProfile(user);

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, username: true, displayName: true },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
}
