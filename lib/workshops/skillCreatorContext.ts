/**
 * Distilled skill-creation guidance for the workshop API route.
 * Sources: Anthropic skill-creator SKILL.md + Thoughtform workshop engine.
 */

export const SKILL_CREATOR_SYSTEM = `You are an expert at writing Claude Skills (SKILL.md files) following Anthropic best practices and the Thoughtform workshop methodology.

A Skill is a reusable markdown instruction file that gives Claude persistent workflow knowledge for a specific task. You are generating one for a specific person on the Poppins team.

## SKILL.md Format

Every skill needs:
1. YAML frontmatter with \`name\` and \`description\`
2. A clear markdown body with workflow instructions

\`\`\`
---
name: skill-slug
description: >
  What the skill does and when to trigger it.
  Be specific: include task types, contexts, and trigger phrases.
---

# Skill Title

Instructions for Claude when this skill is active.
\`\`\`

## Writing Guide

- Keep the body under 300 lines — concise and actionable
- Use imperative form: "Generate…", "Always include…", "Check for…"
- Explain WHY behind instructions, not just WHAT — Claude reasons better with context
- Define clear output formats using markdown templates
- Include 1-2 examples showing input → output
- Organize with clear headings: Purpose, Inputs, Workflow, Output Format, Examples
- Be specific to the person's actual work, not generic
- Encode the person's voice and preferences where relevant
- Reference the company context (Poppins — peer-to-peer sharing platform) naturally

## Thoughtform Capability Ladder Context

Skills sit at Level 3 of the capability ladder:
- Level 1: Prompting — thinking WITH AI
- Level 2: Documents — working WITH files  
- Level 3: Projects & Skills — systematizing recurring work
- Level 4: Cowork — file-based automation
- Level 5: Claude Code — custom tools

A good skill captures the workflow knowledge that would otherwise live only in someone's head. It makes Claude consistent across conversations without the person having to re-explain their context every time.

## Output Requirements

Return ONLY the complete SKILL.md content (frontmatter + body). No explanations, no wrapping, no code fences around the output. The output should be ready to save directly as a file.`;

export const THOUGHTFORM_WORKSHOP_CONTEXT = `## Thoughtform Workshop Context

Poppins is a peer-to-peer sharing platform (sharing everyday items between neighbors). Founded by Lucie Basch, Jonas Mallisse, and Franco Prontera — the same team behind Too Good To Go (500M+ meals saved, 120M users, 20 countries).

The workshop teaches Poppins team members to work effectively with Claude through progressive capability building: from prompts to projects to skills to automation to custom tools.

Core philosophy: AI is intelligence to navigate, not software to command.

### Workshop Principles
1. Share the full picture — the more AI knows, the less it guesses
2. Tell it where to go, not what to say — clear direction over vague requests
3. First answer is a starting point — push back, redirect, refine
4. Explain your reasoning — best results come from conversations, not commands

### What Makes a Good Skill for This Team
- Anchored to real recurring tasks they do weekly/daily
- Encodes their specific voice, constraints, and quality standards
- Works within Claude Projects (persistent context across conversations)
- Saves enough time to justify the 10 minutes spent setting it up`;

export const COWORK_OVERVIEW = `## What is Cowork?

Cowork is Level 4 of the capability ladder — automated file-based workflows using Claude Desktop.

Instead of chatting with Claude, you set up a folder where Claude monitors for new files and processes them automatically. Drop files in → get structured output out.

### How It Works
1. Create a project folder with instructions (CLAUDE.md)
2. Claude Desktop watches for new files in the input folder
3. When files appear, Claude processes them according to your instructions
4. Results land in the output folder — formatted, analyzed, ready to use

### Why It Matters
- Eliminates repetitive manual work that happens on a schedule
- Consistent output quality every time (no "I forgot to mention...")
- Works while you sleep — morning briefings, weekly reports, pipeline updates
- Bridges the gap between "I chat with AI" and "AI works for me"`;

export const SOFTWARE_FOR_FEW_OVERVIEW = `## What is Software for Few?

Software for Few (Level 5 — Claude Code) means building custom tools that are too specific to buy as SaaS and too small to outsource to a dev team, but that can be built with AI assistance.

### The Insight
Every team has tools they wish existed but that no software company would build because the market is too small. A dashboard that tracks YOUR metrics in YOUR format. A calculator that models YOUR business logic. An analyzer that knows YOUR data structure.

### How It Works with Claude Code
1. Describe the tool you need in plain language
2. Claude Code builds it — scripts, interfaces, data pipelines
3. You test, refine, iterate until it works
4. Deploy it for your team — lightweight, purpose-built, maintained by AI

### Why It's Powerful
- 80% of the value of enterprise software at 1% of the cost
- Built for exactly one team's exact workflow
- Can be modified instantly when needs change
- No vendor lock-in, no feature requests, no waiting for roadmap`;
