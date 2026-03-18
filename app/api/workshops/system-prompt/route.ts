import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth/server";
import Anthropic from "@anthropic-ai/sdk";

const requestSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  context: z.string().min(1).max(3000),
  clientName: z.string().optional(),
});

const MODEL =
  process.env.ANTHROPIC_WORKSHOP_MODEL ||
  process.env.ANTHROPIC_PROMPT_ENHANCE_MODEL ||
  "claude-sonnet-4-20250514";

const SYSTEM_INSTRUCTION = `You are an expert at writing Claude system prompts following Anthropic best practices.

Given a person's name, role, company, and background context, generate a concise, effective system prompt they would use as their persistent instruction in Claude Projects.

Best practices to follow:
- Start with a clear role definition ("You are [role]'s AI assistant at [company]...")
- Include persistent context the AI should always know (domain, tools, workflows)
- Add behavioral instructions (tone, format preferences, constraints)
- Include output constraints where relevant ("Always...", "Never...")
- Keep it 3-6 sentences — long enough to be useful, short enough to actually read
- Write in second person addressing Claude ("You are...", "Always...")
- Be specific to their actual work, not generic

Return ONLY the system prompt text. No explanations, labels, quotes, or markdown formatting.`;

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 503 },
    );
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

  const { name, role, context, clientName } = parsed.data;
  const company = clientName || "the company";

  const userMessage = `Generate a system prompt for:

Name: ${name}
Role: ${role}
Company: ${company}
Background & context: ${context}`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.6,
      system: SYSTEM_INSTRUCTION,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const output =
      textBlock && "text" in textBlock ? textBlock.text.trim() : null;

    return NextResponse.json({ systemPrompt: output || "" });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Generation failed";
    console.error("Workshop system-prompt error:", msg);
    return NextResponse.json({ systemPrompt: "", warning: msg });
  }
}
