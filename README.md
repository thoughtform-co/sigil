# Sigil

> Thoughtform is the discipline of navigating the intelligence between thought and form. As the Navigator, I use Sigil to turn that practice into client-specific learning journeys and a creation suite.

I have been doing keynotes and workshops since 2023. For two years, all of them were organized by third parties: someone pays me to show up at a location and teach. That model works until you run out of headspace for prospecting. When the volume faltered in the second half of 2025, I decided to own the format entirely: Thoughtform Home Sessions, small groups of eight people in my living room, covering everything from LLM thinking to image and video model navigation.

A conversation with a fellow creative made me realize I had everything I needed to build a dedicated platform. Not a generic LMS. A creation and learning surface tailored per client, per workshop, per module, all inside the Thoughtform brand world.

Sigil started as the Thoughtform version of Vesper (the image/video generation tool I built for Loop Earplugs), but it has grown into something different: a dual-mode platform where the same infrastructure serves both guided learning journeys and direct creative work.

## What this enables

Each journey operates in one of two modes. **Learn** mode is a client-specific L&D hub with tabbed dashboard (Overview, Curriculum, Resources, Artifacts), immersive lesson pages with scroll-driven storytelling, embedded prompt practice, interactive particle visualizations, and a diamond progression sidebar. **Create** mode is a direct creation workspace with route grid, fast route creation, and straight access to the image/video/canvas generation suite.

The generation suite supports multiple models (Gemini, Replicate, FAL.ai) with prompt enhancement via Claude. Sessions function as scoped waypoints within a route. Every generation is tracked, every output stored.

## Navigation surfaces

**Journey dashboard.** Tabbed hub rendering differently based on journey type. Learn journeys get curriculum structure; Create journeys get a route grid with fast creation.

**Lesson viewer.** Scrolltelling renderer for immersive lesson pages. Content blocks, embedded prompt practice, and interactive particle visualizations built from the same system that powers the Atlas constellation and the Thoughtform.co wormhole.

**Creation suite.** Prompt bar with model selection, generation gallery, session/waypoint sidebar. Multi-model support with real-time generation status. Reference image workflows for image-to-image.

**Admin dashboard.** Journey and route management, user administration.

## Data hierarchy

| Internal model | UI term | Purpose |
|---------------|---------|---------|
| `WorkspaceProject` | Journey | Top-level container (client or project) |
| `Project` | Route | A briefing or creative workspace |
| `Session` | Waypoint | A scoped generation session within a route |
| `Generation` | -- | One prompt submission producing outputs |
| `Output` | -- | A single image or video artifact |

## The constellation

Sigil is the fourth Thoughtform core repo, and it draws from everything that came before. The Navigation HUD and design system from Thoughtform.co. The particle system from Atlas (via Thoughtform.co). The embedding and generation pipeline patterns from Astrolabe. The prompt enhancement architecture that originated with the Atlas Archivist. And the generation infrastructure (model adapters, gallery, prompt bar) directly inherited from Vesper.

What Sigil contributes forward is the most refined version of the Thoughtform brand architecture, evolving toward a scalable design system via a Figma plugin that generates colors, typography, spacing, and components. The dual-mode journey system is a reusable pattern for client-specific experiences. The scroll-driven lesson pages with embedded practice represent a new kind of workshop delivery.

**Sibling repos:** [Astrolabe](https://github.com/thoughtform-co/Astrolabe) (knowledge navigation), [Atlas](https://github.com/thoughtform-co/atlas) (visual navigation), [Thoughtform.co](https://github.com/thoughtform-co/thoughtform) (brand interface)

## Architecture

Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma, Supabase (auth + storage), SWR, Claude API for prompt enhancement.

```
app/
  journeys/              # Journey list + detail pages
    [id]/
      page.tsx           # Dual-mode detail (JourneyHub or CreationHub)
      lessons/[lessonId]/
        page.tsx         # Immersive lesson viewer
  routes/[id]/           # Route workspace (image, video, canvas modes)
  dashboard/             # Admin dashboard
  api/                   # REST API routes

components/
  learning/              # JourneyHub, CreationHub, LessonView, EmbeddedPractice, LatentSpaceScene
  generation/            # ProjectWorkspace, ForgePromptBar, ForgeGallery, ForgeSidebar
  hud/                   # NavigationFrame (top nav, corner brackets, telemetry rails)
  dashboard/             # Admin panels
  journeys/              # Journey/route card components
  ui/                    # Shared primitives

lib/
  learning/              # Content model types, mock data (INKROOT workshop seed)
  terminology.ts         # UI label mapping (journey/route/waypoint/creation suite)
  auth/                  # Auth utilities and access control
  prisma.ts              # Prisma client singleton

prisma/
  schema.prisma          # Database schema

packages/
  figma-plugin/          # Design token generation (colors, typography, spacing, components)
```

The journey detail page renders the appropriate experience based on the `type` field (`"learn"` or `"create"`). A feature flag (`DUAL_MODE_ENABLED`) allows quick rollback.

## Design system

Sigil uses the Thoughtform Navigation UI Grammar. Zero border-radius everywhere, corner brackets and chamfers for shape. Gold (`--gold`) for navigation and active states. Dawn opacity scale for text hierarchy. Diamonds (45-degree rotated squares) replace circles. Monospace for HUD labels and data readouts. 8px grid spacing system. Dark/light mode via `.light` class on `<html>`.

Tokens and component specs live in the Thoughtform design skills. The Figma plugin in `packages/figma-plugin/` generates design system artifacts from the same token definitions.

## Reliability

Auth gating via Supabase, role-based access control, environment variable discipline, Prisma schema validation. Follows the Sentinel pattern across the codebase.

## Getting started

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
npx prisma db push
npx prisma db seed   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string (pooled) |
| `DIRECT_URL` | Prisma direct connection (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Claude API key for prompt enhancement |

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run prisma:push` | Push schema changes |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:seed` | Seed sample data |

## Current frontier

The main open questions: whether the Arcs presentation editor migrates here from Astrolabe (Sigil for workshops, Astrolabe for keynotes/philosophy?), how deep the per-client module customization goes, and how the Figma plugin evolves into a full design token pipeline. The learning layer is functional with INKROOT workshop seed data; the next step is real client content.
