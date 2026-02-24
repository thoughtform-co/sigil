import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const allowed = await prisma.allowedEmail.findUnique({
    where: { email },
    select: { id: true },
  });

  return NextResponse.json({ allowed: !!allowed });
}
