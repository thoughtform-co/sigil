import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth/server";
import Anthropic from "@anthropic-ai/sdk";

const requestSchema = z.object({
  prompt: z.string().min(1),
  modelId: z.string().min(1),
  referenceImageUrl: z.string().optional(),
});

const DEFAULT_PROMPT_ENHANCE_MODEL = "claude-opus-4-6";

const DEFAULT_SYSTEM_PROMPT = `You are an expert prompt engineer for image and video generation.
Return ONLY the enhanced prompt text. No explanations, no labels, no quotes, no code fences.

Rules:
- Preserve user intent and subject
- Add concrete details for lighting, style, framing, and motion when relevant
- Keep output concise and production-ready
- Do not add commentary or explanations
- Do not use words like "stunning", "epic", "breathtaking" — keep it grounded`;

function buildTextContent(prompt: string, modelId: string, hasImage: boolean): string {
  const isVideo = /veo|video|kling/i.test(modelId);

  if (isVideo && hasImage) {
    return `User is animating a still image into a video. User's motion prompt: "${prompt}"
The attached reference image is their starting frame.

Enhance this as an image-to-video motion prompt:
- Do NOT re-describe the full scene in detail.
- Describe ONLY what changes over time: subject motion, environmental motion, camera behavior, pacing.
- Preserve the reference image's style, composition, lighting, and subject identity.
- Keep it as ONE coherent shot idea suitable for ~4-8 seconds.

Return ONLY the enhanced motion prompt text.`;
  }

  if (isVideo) {
    return `User's video prompt: "${prompt}"
Enhance this for a video generation model while keeping the user's intent.

Include when useful:
- A concise storyline or action progression
- Camera guidance (wide shot, close-up, slow pan, push-in)
- Visual tone and lighting (cinematic, soft daylight, moody, golden hour)
- Motion cues (what moves and how)
- Duration-aware phrasing (8s feels complete; avoid overstuffing)

Avoid overly rigid shot lists or technical jargon.
Return ONLY the enhanced prompt text.`;
  }

  if (hasImage) {
    return `User wants to create or edit an image. Their prompt: "${prompt}"
The attached reference image is provided for context.

Enhance this prompt to be clearer and more effective:
- Describe exactly what to change and what to preserve
- Use precise, action-oriented language
- Add helpful details (lighting, composition, style) if appropriate
- Keep the original tone and intent

Return ONLY the enhanced prompt text.`;
  }

  return `User's text-to-image prompt: "${prompt}"
Enhance this prompt while respecting the user's creative vision.

Guidelines:
- Add helpful details (lighting, camera, framing) if appropriate
- Clarify ambiguous elements
- Keep the original tone and style
- Don't add unnecessary complexity

Return ONLY the enhanced prompt text.`;
}

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(fieldErrors)
      .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
      .join("; ");
    return NextResponse.json({ error: msg || "Invalid request" }, { status: 400 });
  }

  const { modelId, prompt, referenceImageUrl } = parsed.data;

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  try {
    const dbPrompt = await prisma.promptEnhancementPrompt.findFirst({
      where: { isActive: true, modelIds: { has: modelId } },
      orderBy: { updatedAt: "desc" },
    });
    if (dbPrompt?.systemPrompt) {
      systemPrompt = dbPrompt.systemPrompt;
    }
  } catch {
    // Table may not exist yet
  }

  const imageData = referenceImageUrl ? parseDataUrl(referenceImageUrl) : null;
  const hasImage = imageData !== null;
  const textContent = buildTextContent(prompt, modelId, hasImage);

  const messageContent: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (imageData) {
    messageContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageData.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: imageData.data,
      },
    });
  }
  messageContent.push({ type: "text", text: textContent });

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_PROMPT_ENHANCE_MODEL || DEFAULT_PROMPT_ENHANCE_MODEL,
      max_tokens: 1500,
      temperature: 0.65,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    let enhanced = textBlock && "text" in textBlock ? textBlock.text.trim() : null;

    if (enhanced) {
      enhanced = enhanced
        .replace(/^```[\w]*\n?/gm, "")
        .replace(/\n?```$/gm, "")
        .trim();
    }

    if (!enhanced) {
      enhanced = fallbackEnhance(prompt, modelId, hasImage);
    }

    return NextResponse.json({
      originalPrompt: prompt,
      enhancedPrompt: enhanced,
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Enhancement failed";
    console.error("Prompt enhancement error:", errMsg);

    const fallback = fallbackEnhance(prompt, modelId, hasImage);
    return NextResponse.json({
      originalPrompt: prompt,
      enhancedPrompt: fallback,
      warning: errMsg,
    });
  }
}

function fallbackEnhance(prompt: string, modelId: string, hasImage: boolean): string {
  const isVideo = /veo|video|kling/i.test(modelId);
  if (isVideo) {
    return `${prompt.trim()}. Cinematic motion, coherent 5-10s single-shot progression, smooth camera movement, natural lighting, high visual clarity.`;
  }
  if (hasImage) {
    return `${prompt.trim()}. Use the reference image as style guidance while preserving a fresh composition and subject clarity.`;
  }
  return `${prompt.trim()}. Detailed composition, strong subject focus, professional lighting, rich texture, and clean final render.`;
}
