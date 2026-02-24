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

  const list = await prisma.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      note: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ allowedEmails: list });
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  try {
    const created = await prisma.allowedEmail.create({
      data: {
        email,
        note,
        addedBy: user.id,
      },
      select: {
        id: true,
        email: true,
        note: true,
        createdAt: true,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email already allowed" }, { status: 409 });
    }
    throw e;
  }
}
