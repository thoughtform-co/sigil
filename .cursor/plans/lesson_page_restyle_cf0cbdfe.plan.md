---
name: Lesson Page Restyle
overview: "Restyle the curriculum lesson page to use the same left-rail spine pattern as route workspaces: journey context in the nav-spine, sections rail underneath the spine instead of the right sidebar, and narrative content shifted right into the main content area."
todos:
  - id: lesson-spine-context
    content: Pass journeyName, journeyId, and lessonName to NavigationFrame on the lesson page so the spine shows JOURNEY + LESSON bearings.
    status: completed
  - id: lesson-layout-flip
    content: Flip the lesson layout from right-sidebar sections to single-column narrative, with sections moved to the left spine area.
    status: completed
  - id: lesson-progress-rail
    content: Reposition the progress/sections rail as a spine extension below the lesson breadcrumb, either via NavSpineContext portal or fixed positioning.
    status: completed
isProject: false
---

# Lesson Page Restyle

## Current State

The lesson page uses a two-column CSS grid: narrative on the left (680px max), progress/sections rail on the right (200px). The journey breadcrumb uses `breadcrumbOverride` which renders as a simple inline label, not the spine-mode `ContextAnchor` that route workspaces use.

```1:10:app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css
.layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: var(--space-xl);
  width: 100%;
  max-width: 1100px;
  ...
}
```

```55:56:app/journeys/[id]/lessons/[lessonId]/page.tsx
<NavigationFrame title="SIGIL" modeLabel="lesson" breadcrumbOverride={breadcrumb}>
```

## Target State

Match the route workspace pattern:

- **Left rail spine**: Journey name (with JOURNEY bearing) + Lesson title (with LESSON bearing), using the same `ContextAnchor` spine mode
- **Sections rail**: Moves from the right sidebar to below the spine in the left rail area (portalled or inline under the breadcrumb)
- **Narrative content**: Shifts right to occupy the main content area (right of the spine), matching how generation content sits right of the journey/route spine on route pages

## Changes

### 1. Lesson page shell ([app/journeys/[id]/lessons/[lessonId]/page.tsx](app/journeys/[id]/lessons/[lessonId]/page.tsx))

- Pass `journeyName` and `journeyId` to `NavigationFrame` instead of `breadcrumbOverride`. The journey name is available from `content.profile.name`.
- Remove `breadcrumbOverride` -- let the spine handle context.
- The `NavigationFrame` breadcrumb builder for `/journeys/[id]/lessons/[lid]` already returns segments; it just needs `journeyName` to activate spine mode.

### 2. NavigationFrame breadcrumb logic ([components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx))

- When `journeyName` is passed on a lesson page (`/journeys/[id]/lessons/[lid]`), the spine should show:
  - JOURNEY bearing + journey name (clickable to `/journeys/[id]`)
  - LESSON bearing + lesson title (current page, not clickable)
- Add a `lessonName` prop to `NavigationFrame` and wire it into the breadcrumb builder for the lessons path.

### 3. Layout flip ([app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css](app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css))

- Change `.layout` from `grid-template-columns: 1fr 200px` to a single-column layout (the spine area is now handled by `NavigationFrame`, not the grid).
- Remove `.progressRail` from the right side -- it will be rendered as a separate component in the spine area.

### 4. Progress rail as spine extension ([components/learning/LessonView.tsx](components/learning/LessonView.tsx))

- Extract the progress rail into its own element that can be portalled into the `NavigationFrame` spine slot (via `NavSpineContext.portalRef`), similar to how `WaypointBranch` works on route pages.
- Alternatively, if portalling is too complex for this pass, render the progress rail as a fixed-position element below the spine, matching the spine's left offset.

## Visual Result

```
JOURNEY                        |  01 -- ORIENTATION
INKROOTS  -->                  |  THE ANATOMY OF A PROMPT
─────────────────              |  Subject, style, mood...
LESSON                         |
THE ANATOMY OF A PROMPT        |  EVERYTHING IS ENCODED
                               |  Every image, every word...
SECTIONS                       |
  Everything is encoded        |
  Explore the Latent Space     |
  Prompts as coordinates       |
  Checkpoint                   |
```

Left rail shows journey + lesson context plus section navigation. Narrative content fills the main area to the right, no longer constrained to 680px within a grid.