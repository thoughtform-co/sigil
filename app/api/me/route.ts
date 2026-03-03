import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { withCacheHeaders } from "@/lib/api/cache-headers";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, username: true, displayName: true },
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: profile ?? { id: user.id, role: "user", username: null, displayName: null },
  });
  return withCacheHeaders(response, "private-short");
}
