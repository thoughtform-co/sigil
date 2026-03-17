import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth/server";
import Anthropic from "@anthropic-ai/sdk";

const requestSchema = z.object({
  sourceText: z.string().min(1).max(2000),
  stage: z.enum(["basic", "dimensional", "semantic"]),
  clientName: z.string().optional(),
  dimensions: z
    .object({
      cringe: z.number().min(0).max(10).optional(),
      formality: z.number().min(0).max(10).optional(),
    })
    .optional(),
  bridgePerspective: z.string().max(200).optional(),
});

const MODEL =
  process.env.ANTHROPIC_WORKSHOP_MODEL ||
  process.env.ANTHROPIC_PROMPT_ENHANCE_MODEL ||
  "claude-sonnet-4-20250514";

function buildSystemPrompt(stage: string, clientName?: string): string {
  const brand = clientName ? ` for the ${clientName} brand` : "";

  if (stage === "basic") {
    return `You are a writing assistant helping a workshop participant rewrite a social media post${brand}.
The user will provide a post and ask for a rewrite focused on clarity or brevity.
Return ONLY the rewritten post. No explanations, labels, or commentary.
Keep the core message intact. Make it better.`;
  }

  if (stage === "dimensional") {
    return `You are a writing assistant demonstrating dimensional prompt navigation${brand}.
The user provides a social media post and two dimension values (cringe 0-10 and formality 0-10).
Rewrite the post matching those dimension values exactly:
- Cringe 0 = professional and grounded. Cringe 10 = maximum internet-speak, emojis, exclamation marks.
- Formality 0 = casual and conversational. Formality 10 = corporate/institutional language.
Return ONLY the rewritten post. No explanations.`;
  }

  return `You are a writing assistant demonstrating semantic navigation${brand}.
The user provides a topic or prompt and a perspective to approach it from.
Rewrite/analyze the topic entirely from that perspective, using its vocabulary, mental models, and concerns.
The point is to force unexpected insights by bridging incompatible contexts.
Return ONLY the rewritten analysis (2-4 sentences). No meta-commentary.`;
}

function buildUserMessage(
  sourceText: string,
  stage: string,
  dimensions?: { cringe?: number; formality?: number },
  bridgePerspective?: string,
): string {
  if (stage === "basic") {
    return `Rewrite this post for clarity and brevity:\n\n${sourceText}`;
  }

  if (stage === "dimensional") {
    const c = dimensions?.cringe ?? 5;
    const f = dimensions?.formality ?? 5;
    return `Rewrite this post with cringe level ${c}/10 and formality level ${f}/10:\n\n${sourceText}`;
  }

  const perspective = bridgePerspective || "a pack of wolves protecting territory";
  return `Analyze this from the perspective of ${perspective}:\n\n${sourceText}`;
}

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sourceText, stage, clientName, dimensions, bridgePerspective } = parsed.data;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.7,
      system: buildSystemPrompt(stage, clientName),
      messages: [
        {
          role: "user",
          content: buildUserMessage(sourceText, stage, dimensions, bridgePerspective),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const output = textBlock && "text" in textBlock ? textBlock.text.trim() : null;

    return NextResponse.json({ output: output || sourceText, stage });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    console.error("Workshop prompt-playground error:", msg);
    return NextResponse.json({ output: sourceText, stage, warning: msg });
  }
}
