import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [projects, sessions, generations, outputs] = await Promise.all([
    prisma.project.count(),
    prisma.session.count(),
    prisma.generation.count(),
    prisma.output.count(),
  ]);

  return NextResponse.json({
    stats: { projects, sessions, generations, outputs },
    env: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      database: Boolean(process.env.DATABASE_URL),
      replicate: Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      fal: Boolean(process.env.FAL_KEY),
      klingOfficial: Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
    },
  });
}
