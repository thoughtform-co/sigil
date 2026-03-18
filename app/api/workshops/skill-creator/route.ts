import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  SKILL_CREATOR_SYSTEM,
  THOUGHTFORM_WORKSHOP_CONTEXT,
} from "@/lib/workshops/skillCreatorContext";

const requestSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  background: z.string().min(1).max(2000),
  skillSlug: z.string().min(1).max(200),
  skillDescription: z.string().min(1).max(2000),
  clientName: z.string().optional(),
});

const MODEL =
  process.env.ANTHROPIC_WORKSHOP_MODEL ||
  process.env.ANTHROPIC_PROMPT_ENHANCE_MODEL ||
  "claude-sonnet-4-20250514";

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

  const { name, role, background, skillSlug, skillDescription, clientName } =
    parsed.data;
  const company = clientName || "the company";

  const userMessage = `Generate a complete SKILL.md file for:

Name: ${name}
Role: ${role} at ${company}
Background: ${background}

Skill to generate:
- Slug: ${skillSlug}
- Purpose: ${skillDescription}

${THOUGHTFORM_WORKSHOP_CONTEXT}

Generate the full SKILL.md content now. Make it specific to ${name}'s actual work at ${company}, not generic. Include concrete examples drawn from their role.`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: SKILL_CREATOR_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const output =
      textBlock && "text" in textBlock ? textBlock.text.trim() : null;

    return NextResponse.json({ skill: output || "" });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Skill generation failed";
    console.error("Workshop skill-creator error:", msg);
    return NextResponse.json({ skill: "", warning: msg });
  }
}
