import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { json } from "@/lib/api/responses";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const [projects, sessions, generations, outputs] = await Promise.all([
    prisma.project.count(),
    prisma.session.count(),
    prisma.generation.count(),
    prisma.output.count(),
  ]);

  const isDev = process.env.NODE_ENV === "development";
  return json({
    stats: { projects, sessions, generations, outputs },
    ...(isDev && {
      env: {
        supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        database: Boolean(process.env.DATABASE_URL),
        replicate: Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        fal: Boolean(process.env.FAL_KEY),
        klingOfficial: Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
      },
    }),
  });
}
