import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { user } = result;

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
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { user } = result;

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
