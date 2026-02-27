# Sigil

Visual AI creation and learning platform by [Thoughtform](https://thoughtform.co). Navigate the latent space through guided workshops or direct image and video generation.

## Architecture

Built with Next.js 16 (App Router), Prisma, Supabase (auth + storage), and SWR. Uses the Thoughtform Navigation UI Grammar -- sharp geometry, gold-on-void, zero border-radius, diamond waypoints.

### Data hierarchy

| Internal model        | UI term       | Purpose                                   |
|-----------------------|---------------|-------------------------------------------|
| `WorkspaceProject`    | Journey       | Top-level container (client or project)   |
| `Project`             | Route         | A briefing or creative workspace          |
| `Session`             | Waypoint      | A scoped generation session within a route|
| `Generation`          | --            | One prompt submission producing outputs   |
| `Output`              | --            | A single image or video artifact          |

### Dual-mode journeys

Each journey has a `type` field (`"learn"` or `"create"`):

- **Learn** -- Client-specific L&D hub with tabbed dashboard (Overview, Curriculum, Resources, Artifacts), immersive lesson pages with scroll-driven storytelling, embedded prompt practice, interactive particle visualizations, and diamond progression sidebar.
- **Create** -- Direct creation workspace with route grid, fast route creation, and straight access to the image/video/canvas generation suite.

The journey detail page (`app/journeys/[id]/page.tsx`) renders the appropriate experience based on the `type` field. A feature flag (`DUAL_MODE_ENABLED`) allows quick rollback.

### Key directories

```
app/
  journeys/            Journey list + detail pages
    [id]/
      page.tsx          Dual-mode journey detail (JourneyHub or CreationHub)
      lessons/[lessonId]/
        page.tsx        Immersive lesson viewer
  routes/[id]/          Route workspace (image, video, canvas modes)
  dashboard/            Admin dashboard
  api/                  REST API routes

components/
  learning/             Learning layer components
    JourneyHub.tsx      Tabbed client L&D dashboard
    CreationHub.tsx     Direct creation workspace
    LessonView.tsx      Scrolltelling lesson renderer
    EmbeddedPractice.tsx  Inline prompt practice
    LatentSpaceScene.tsx  Interactive particle visualization
  generation/           Creation suite components
    ProjectWorkspace.tsx  Main generation workspace
    ForgePromptBar.tsx    Prompt input with model selection
    ForgeGallery.tsx      Generation output gallery
    ForgeSidebar.tsx      Session/waypoint sidebar
  hud/                  Thoughtform HUD primitives
    NavigationFrame.tsx   Top nav, corner brackets, telemetry rails
  dashboard/            Admin dashboard panels
  journeys/             Journey/route card components
  ui/                   Shared UI primitives

lib/
  learning/             Learning content model and mock data
    types.ts            Typed interfaces (JourneyContent, Chapter, Lesson, ContentBlock)
    mockJourneyContent.ts  INKROOT workshop seed data
  terminology.ts        UI label mapping (journey/route/waypoint/creation suite)
  auth/                 Auth utilities and access control
  prisma.ts             Prisma client singleton

prisma/
  schema.prisma         Database schema
```

## Getting started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# Push schema to database
npx prisma db push

# Seed sample data (optional)
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string (pooled) |
| `DIRECT_URL` | Prisma direct connection (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Claude API key for prompt enhancement |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run prisma:push` | Push schema changes to database |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:seed` | Seed database with sample data |

## Design system

Sigil uses the Thoughtform Navigation UI Grammar. Key principles:

- **Zero border-radius** everywhere. Corner brackets and chamfers for shape.
- **Gold** (`--gold`) for navigation and active states. Dawn opacity scale for text hierarchy.
- **Diamonds** (45deg rotated squares) replace circles as markers.
- **Monospace** (`--font-mono`) for HUD labels, data readouts, and instrument-like text.
- **8px grid** spacing system (`--space-xs` through `--space-4xl`).
- **Dark/light** mode via `.light` class on `<html>`. Void backgrounds, dawn text.

Tokens and component specs are in the `skills/thoughtform-design/references/` directory.
