import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import { projectAccessFilter } from "@/lib/auth/project-access";

const createMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function canAccessProject(projectId: string, userId: string) {
  const accessFilter = await projectAccessFilter(userId);
  return prisma.project.findFirst({
    where: { id: projectId, ...accessFilter },
    select: { id: true },
  });
}

async function ensureProjectChat(projectId: string, userId: string) {
  const existing = await prisma.projectChat.findFirst({
    where: { projectId, userId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.projectChat.create({
    data: { projectId, userId, title: "Brainstorm" },
    select: { id: true },
  });
  return created.id;
}

async function generateAssistantReply(content: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `Direction pass:\n- Core concept: ${content}\n- Variation axis: push one stylistic contrast and one lighting contrast\n- Next prompt: convert this into a 1-2 sentence production prompt with camera/framing details`;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_BRAINSTORM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 500,
      temperature: 0.7,
      system:
        "You are SIGIL's creative brainstorm copilot. Return concise, practical ideation guidance for image/video generation. Do not use markdown tables.",
      messages: [{ role: "user", content: [{ type: "text", text: content }] }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || response.statusText);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = payload.content?.find((block) => block.type === "text");
  return textBlock?.text?.trim() || "No response generated.";
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await context.params;
  const project = await canAccessProject(projectId, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const chatId = await ensureProjectChat(projectId, user.id);
  const messages = await prisma.projectChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await context.params;
  const project = await canAccessProject(projectId, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chatId = await ensureProjectChat(projectId, user.id);
  const userMessage = await prisma.projectChatMessage.create({
    data: {
      chatId,
      userId: user.id,
      role: "user",
      content: parsed.data.content.trim(),
    },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  let assistantContent: string;
  try {
    assistantContent = await generateAssistantReply(parsed.data.content.trim());
  } catch {
    assistantContent =
      "Direction pass:\n- Break the concept into subject, environment, and mood\n- Define one strong camera move\n- Add one controlled variation and generate 3 outputs";
  }

  const assistantMessage = await prisma.projectChatMessage.create({
    data: {
      chatId,
      role: "assistant",
      content: assistantContent,
    },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages: [userMessage, assistantMessage] }, { status: 201 });
}
