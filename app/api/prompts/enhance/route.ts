import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";

const requestSchema = z.object({
  prompt: z.string().min(1),
  modelId: z.string().min(1),
  referenceImageUrl: z.string().url().optional(),
});

const DEFAULT_SYSTEM_PROMPT = `You are an expert prompt engineer for image and video generation.
Return ONLY the enhanced prompt text.

Rules:
- Preserve user intent and subject
- Add concrete details for lighting, style, framing, and motion when relevant
- Keep output concise and production-ready
- Do not add commentary or explanations`;

async function enhanceWithAnthropic(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_PROMPT_ENHANCE_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Anthropic request failed: ${details || response.statusText}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = payload.content?.find((block) => block.type === "text");
  return textBlock?.text?.trim() || null;
}

function enhanceFallback(prompt: string, modelId: string, referenceImageUrl?: string): string {
  const isVideo = /veo|video|kling/i.test(modelId);
  if (isVideo) {
    return `${prompt.trim()}. Cinematic motion, coherent 5-10s single-shot progression, smooth camera movement, natural lighting, high visual clarity.`;
  }
  if (referenceImageUrl) {
    return `${prompt.trim()}. Use the reference image as style guidance while preserving a fresh composition and subject clarity.`;
  }
  return `${prompt.trim()}. Detailed composition, strong subject focus, professional lighting, rich texture, and clean final render.`;
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modelId, prompt, referenceImageUrl } = parsed.data;

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  try {
    const dbPrompt = await prisma.promptEnhancementPrompt.findFirst({
      where: {
        isActive: true,
        modelIds: {
          has: modelId,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (dbPrompt?.systemPrompt) {
      systemPrompt = dbPrompt.systemPrompt;
    }
  } catch {
    // Graceful fallback when table is not yet migrated.
  }

  const userPrompt = referenceImageUrl
    ? `Model: ${modelId}\nUser prompt: ${prompt}\nReference image URL: ${referenceImageUrl}\nEnhance this prompt.`
    : `Model: ${modelId}\nUser prompt: ${prompt}\nEnhance this prompt.`;

  try {
    const enhanced =
      (await enhanceWithAnthropic(systemPrompt, userPrompt)) ??
      enhanceFallback(prompt, modelId, referenceImageUrl);

    return NextResponse.json({
      originalPrompt: prompt,
      enhancedPrompt: enhanced,
    });
  } catch (error) {
    const fallback = enhanceFallback(prompt, modelId, referenceImageUrl);
    return NextResponse.json({
      originalPrompt: prompt,
      enhancedPrompt: fallback,
      warning: error instanceof Error ? error.message : "Enhancement fallback used",
    });
  }
}
