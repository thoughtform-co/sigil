---
name: Dashboard quadrant redesign
overview: Redesign the Sigil homepage into a quadrant-based dashboard (Starfield-inspired), introduce three-level terminology (Journeys > Routes > Waypoints), and create distinct user/admin views with a central image gallery, right-rail navigation lists, and admin statistics.
todos:
  - id: terminology
    content: Create lib/terminology.ts and update all UI-facing labels (journeys/routes/waypoints)
    status: completed
  - id: nav-sizing
    content: Add navSize prop to NavigationFrame; large items on dashboard, standard on inner pages
    status: completed
  - id: dashboard-api
    content: Create /api/dashboard endpoint returning gallery data, journey list, and admin stats
    status: completed
  - id: dashboard-ui
    content: Build DashboardView, ImageGallery, JourneyList, AdminStatsPanel components
    status: completed
  - id: dashboard-page
    content: Create /dashboard page and update root redirect
    status: completed
  - id: journey-detail
    content: Create /journeys/[id] page and API to show Routes within a Journey
    status: completed
  - id: route-rename
    content: Rename /projects/[id]/* routes to /routes/[id]/* and update all links
    status: completed
  - id: seed-data
    content: Create 'Visual AI Workshop One' journey and link existing projects
    status: completed
isProject: false
---

# Dashboard Quadrant Redesign

## Terminology Mapping

The three navigation levels, aligned with the Thoughtform navigational leitmotif:

- **Journey** = `WorkspaceProject` (top level, e.g. "Visual AI Workshop One")
- **Route** = `Project` (middle level, briefings within a Journey)
- **Waypoint** = `Session` (bottom level, image/video generation sessions)

The Prisma models and database table names stay unchanged (`workspace_projects`, `projects`, `sessions`) -- only UI-facing labels change. A shared constants file provides the canonical terms.

## Architecture

```mermaid
flowchart LR
  subgraph dashboardPage [Dashboard "/"]
    NavLeft["Left Nav (large items)"]
    Gallery["Center: Image Gallery"]
    RightPanel["Right: Journey/Route list"]
    AdminStats["Bottom-right: User Stats (admin only)"]
  end
  subgraph journeyPage ["Journey /journeys/:id"]
    NavLeft2["Left Nav (large items)"]
    RouteList["Route Cards grid"]
  end
  subgraph routeWorkspace ["Route /routes/:id/image"]
    NavLeft3["Left Nav (standard items)"]
    WaypointSidebar["Waypoint Sidebar"]
    GenerationArea["Generation Workspace"]
  end
  dashboardPage -->|"click journey"| journeyPage
  journeyPage -->|"click route"| routeWorkspace
```



## Layout: Quadrant Dashboard

Inspired by the Starfield status/hub screens, the dashboard occupies the full HUD frame with content organized into spatial quadrants:

```
+------+------------------+----------------------------+--------+------+
| tick | NAV PANEL        |         CENTER             |  RIGHT |  tick|
| rail | (large items)    |                            |  PANEL |  rail|
|      |                  |   +------+  +------+       |        |      |
|      | SIGIL            |   | card |  | card |       | Journey|      |
|      | --------         |   | img  |  | img  |       | List   |      |
|      | journeys         |   +------+  +------+       |        |      |
|      | routes           |   +------+  +------+       |--------|      |
|      | analytics        |   | card |  | card |       | Stats  |      |
|      | --------         |   | img  |  | img  |       | (admin)|      |
|      | bookmarks        |   +------+  +------+       |        |      |
|      | settings         |                            |        |      |
+------+------------------+----------------------------+--------+------+
```

### Design Specifications (Token-Level)

All spacing follows the existing 8px grid (`globals.css`). All type uses the established font stack, opacity scale, and transition timing.

**Left nav (large mode)**:

- Font: `var(--font-mono)`, 15px (up from 13px), `letter-spacing: 0.1em`, `text-transform: uppercase`
- Padding: `14px 12px` (up from `11px 12px` -- one 8px-grid step of vertical breathing room)
- Active indicator: existing gold left-bar (`width: 2px, height: 16px`) unchanged
- Hover/active colors: same `var(--dawn-40)` default, `var(--gold)` active, `var(--dawn-70)` hover
- Transition: `color var(--duration-fast), background var(--duration-fast)` (existing)

**Center gallery cards**:

- Container: CSS Grid, `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`, `gap: var(--space-md)` (16px)
- Card: `background: var(--surface-0)`, `border: 1px solid var(--dawn-08)`, `aspect-ratio: 3/4`
- Corner brackets on hover: 14px arm, `1px solid var(--gold)`, matching existing `ProjectCard` accents
- Image: `object-fit: cover`, full bleed within card
- Info overlay (bottom): `background: rgba(10, 9, 8, 0.6)`, `backdrop-filter: blur(12px)`, `border-top: 1px solid var(--dawn-08)`
- Prompt text: `var(--font-mono)`, 9px, `letter-spacing: 0.06em`, `color: var(--dawn-50)`, single-line truncated
- Model label: `var(--font-mono)`, 9px, `color: var(--dawn-30)`, `text-transform: uppercase`
- Hover lift: `transform: translateY(-2px)`, `transition: transform var(--duration-base) var(--ease-out)`
- Hover border: `border-color: var(--dawn-15)` (per FramePanel convention)
- Entrance animation: existing `animate-fade-in-up` with staggered `animationDelay: index * 0.06s`

**Right panel**:

- Width: 280px fixed (fits within HUD padding + right rail)
- Spacing from center: `var(--space-xl)` (24px) gap
- Section label: `.sigil-section-label` (11px, mono, gold, 0.12em tracking, uppercase)
- Section separator: `1px solid var(--dawn-08)`, `margin: var(--space-md) 0` (16px)

**Journey list rows** (grammar: EventCard + DataReadout):

- Row: `padding: 10px 0`, `border-bottom: 1px solid var(--dawn-04)`
- Journey name: `var(--font-mono)`, 12px, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: var(--dawn-70)`
- Route count: `var(--font-mono)`, 9px, `color: var(--dawn-30)`, right-aligned
- Diamond marker prefix: 6px gold diamond (`transform: rotate(45deg)`) before journey name
- Hover: `background: var(--dawn-04)`, `color: var(--dawn)` (80ms transition)
- Expanded child routes: indented `padding-left: var(--space-md)` (16px), `font-size: 11px`, `color: var(--dawn-50)`

**Admin stats rows** (grammar: DataReadout + StatusBar):

- Row: `display: flex`, `justify-content: space-between`, `align-items: center`, `padding: 8px 0`
- Separator: `1px solid var(--dawn-08)` between rows
- User name (left): `var(--font-mono)`, 11px, `letter-spacing: 0.06em`, `color: var(--dawn-50)`, with `background: var(--dawn-04)` pill-like fill, `padding: 3px 8px`
- Generation count (right): `var(--font-mono)`, 13px, `color: var(--dawn)`, tabular-nums
- Section header: "user activity" in `.sigil-section-label` style
- Max rows visible without scroll: ~8-10 (compact enough to share the right panel with JourneyList)

**Dashboard-level shell overrides**:

- The `hud-shell` on dashboard pages uses the existing `padding-top: calc(var(--hud-padding) + 80px)` -- no changes needed
- Main content area: `display: flex`, `gap: var(--space-xl)` (24px), `align-items: flex-start`
- Center gallery: `flex: 1`, `min-width: 0`
- Right panel: `flex: 0 0 280px`, `position: sticky`, `top: calc(var(--hud-padding) + 80px)` (stays in view on scroll)

**Responsive breakpoints** (matching existing `globals.css` breakpoints):

- Below 1280px: Right panel shrinks to 240px, gallery cards `minmax(180px, 1fr)`
- Below 1100px: Right panel stacks below gallery (single column), nav panel hides (existing behavior via `.sigil-nav-panel { display: none }`)
- Below 600px: Cards `minmax(140px, 1fr)`, right panel full-width

## Phase 1: Terminology Constants and Sidebar Rename

**Create** `[lib/terminology.ts](lib/terminology.ts)` -- single source of truth for UI labels. Maps internal model names to user-facing strings. Example:

```ts
export const TERMS = {
  journey: { singular: 'journey', plural: 'journeys' },
  route:   { singular: 'route',   plural: 'routes'   },
  waypoint:{ singular: 'waypoint',plural: 'waypoints' },
} as const;
```

**Update** `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`:

- Rename `SIDEBAR_ITEMS` labels: "projects" to "routes", "briefings" to "journeys"
- Reorder: journeys first, then routes (journeys is the top-level entry point)
- Add `navSize?: "default" | "large"` prop to `NavigationFrameProps`
- When `navSize="large"`: sidebar items render at `fontSize: 15px`, `padding: 14px 12px` (vs default 13px / 11px 12px)
- The SIGIL badge, rail ticks, corner brackets, and top-right utility icons remain unchanged at all sizes
- The `navSize` difference is subtle and deliberate -- just enough to signal "overview" vs "workspace" without jarring the eye

**Update** all user-facing strings in:

- `[components/projects/ProjectsView.tsx](components/projects/ProjectsView.tsx)` -- "generation projects" to "routes", "new project" to "new route"
- `[components/projects/ProjectCard.tsx](components/projects/ProjectCard.tsx)` -- link text and metadata labels
- Admin workspace-project pages (if any UI exists)

## Phase 2: Dashboard API

**Create** `app/api/dashboard/route.ts`:

- Returns aggregated dashboard data in one call
- **Gallery data**: Recent `Output` records (latest 20-30) with `fileUrl`, `fileType`, `width`, `height`, plus parent `Generation.prompt`, `Generation.modelId`, `Session.name`, `Project.name`
- **Journey list**: User's accessible Journeys (via `WorkspaceProjectMember` or admin override), each with route count and total generation count
- **Admin stats** (only when `role === "admin"`): Per-user generation counts (`Profile.displayName` + image count + video count), ordered by total desc

## Phase 3: Dashboard UI Components

**Create** `components/dashboard/DashboardView.tsx`:

- Top-level layout using `display: flex`, `gap: var(--space-xl)`, `align-items: flex-start`
- Detects `isAdmin` from `useAuth()` to conditionally render admin panels
- Center: `flex: 1, min-width: 0` -- the gallery
- Right: `flex: 0 0 280px`, `position: sticky`, `top: calc(var(--hud-padding) + 80px)` -- stays put on scroll
- Wraps children in `animate-fade-in-up` for consistent entrance (existing keyframe)
- No new CSS classes -- composed entirely from existing tokens and inline styles (matching repo convention)

**Create** `components/dashboard/ImageGallery.tsx`:

- CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`, `gap: var(--space-md)`
- Each card: `background: var(--surface-0)`, `border: 1px solid var(--dawn-08)`, `aspect-ratio: 3/4`, `overflow: hidden`
- Image: `object-fit: cover`, fills card
- Corner brackets on hover: 14px arm, `1px solid var(--gold)`, using four `<span>` pseudo-corners (same pattern as existing `ProjectCard`)
- Glassmorphism info overlay at bottom: `background: rgba(10, 9, 8, 0.6)`, `backdrop-filter: blur(12px)`, `border-top: 1px solid var(--dawn-08)`, `padding: 8px 10px`
- Prompt snippet: mono 9px, `var(--dawn-50)`, single-line with `text-overflow: ellipsis`
- Model label: mono 9px, `var(--dawn-30)`, uppercase
- Hover: card lifts `translateY(-2px)`, border shifts to `var(--dawn-15)` -- transitions use `var(--duration-base) var(--ease-out)`
- Staggered entrance: each card gets `animationDelay: index * 0.06s` with `animate-fade-in-up`
- No auto-rotate/carousel for v1 -- static grid is cleaner and avoids distracting motion; carousel can be a follow-up

**Create** `components/dashboard/JourneyList.tsx`:

- Section header: "journeys" in `.sigil-section-label` (11px, mono, gold, 0.12em tracking, uppercase)
- Each row: `padding: 10px 0`, `border-bottom: 1px solid var(--dawn-04)`, `display: flex`, `align-items: center`, `gap: 8px`
- Diamond marker: 6px gold diamond before name (Waypoint grammar primitive)
- Journey name: mono 12px, `letter-spacing: 0.08em`, uppercase, `var(--dawn-70)`
- Route count badge: mono 9px, `var(--dawn-30)`, right-aligned (`margin-left: auto`)
- Hover: `background: var(--dawn-04)`, `color: var(--dawn)`, transition 80ms
- Expandable child routes: `padding-left: var(--space-md)`, mono 11px, `var(--dawn-50)`, each with small diamond `var(--dawn-30)`
- Clicking journey navigates to `/journeys/[id]`, clicking route to `/routes/[id]/image`

**Create** `components/dashboard/AdminStatsPanel.tsx`:

- Section header: "user activity" in `.sigil-section-label`
- Separated from JourneyList by `1px solid var(--dawn-08)` divider with `margin: var(--space-md) 0`
- Each row: `display: flex`, `justify-content: space-between`, `align-items: center`, `padding: 8px 0`, `border-bottom: 1px solid var(--dawn-08)`
- User name (left): mono 11px, `letter-spacing: 0.06em`, `color: var(--dawn-50)`, with subtle `background: var(--dawn-04)`, `padding: 3px 8px`
- Count (right): mono 13px, `color: var(--dawn)`, `font-variant-numeric: tabular-nums`
- Compact: max ~8-10 visible rows; if more users, scrollable with `max-height` and `overflow-y: auto` styled to match (no visible scrollbar, or the energy-beam scroll pattern from right rail)

**Create** `app/dashboard/page.tsx`:

- Wraps `RequireAuth` > `NavigationFrame` (with `showNavPanel navSize="large"`) > `DashboardView`
- `paddingTop: "var(--space-2xl)"` on inner section (matching current ProjectsView)

**Update** `app/page.tsx`:

- Change redirect from `/projects` to `/dashboard`

## Phase 4: Journey Detail Page

**Create** `app/journeys/[id]/page.tsx`:

- Shows all Routes (Projects) within a Journey
- Uses `NavigationFrame` with `navSize="large"` (still overview-level)
- Grid of Route cards similar to current ProjectCard but with waypoint count

**Create** `app/api/journeys/[id]/route.ts`:

- Returns Journey detail with its Routes, accessible to members and admins

## Phase 5: Route Rename and Linking

**Rename** `app/projects/[id]/`* routes to `app/routes/[id]/`*:

- `/routes/[id]/image`, `/routes/[id]/video`, `/routes/[id]/canvas`
- Update all internal links and redirects
- Keep `/projects` as a legacy redirect or remove

**Update** NavigationFrame `SIDEBAR_ITEMS` hrefs to match new URL structure.

## Phase 6: Seed Data

**Create** the first Journey via a seed script or direct API call:

- Journey name: "Visual AI Workshop One"
- Link any existing Projects to this Journey (set their `workspaceProjectId`)
- This ensures the dashboard has real data to display

No Prisma schema migration needed -- the `workspace_projects`, `projects`, and `sessions` tables already exist with the correct relationships. Only data needs to be created.

## Key Files Summary


| Action | Path                                       |
| ------ | ------------------------------------------ |
| Create | `lib/terminology.ts`                       |
| Create | `app/api/dashboard/route.ts`               |
| Create | `app/dashboard/page.tsx`                   |
| Create | `components/dashboard/DashboardView.tsx`   |
| Create | `components/dashboard/ImageGallery.tsx`    |
| Create | `components/dashboard/JourneyList.tsx`     |
| Create | `components/dashboard/AdminStatsPanel.tsx` |
| Create | `app/journeys/[id]/page.tsx`               |
| Create | `app/api/journeys/[id]/route.ts`           |
| Modify | `components/hud/NavigationFrame.tsx`       |
| Modify | `components/projects/ProjectsView.tsx`     |
| Modify | `components/projects/ProjectCard.tsx`      |
| Modify | `app/page.tsx`                             |


