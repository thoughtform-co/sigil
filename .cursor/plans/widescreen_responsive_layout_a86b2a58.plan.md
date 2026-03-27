---
name: Widescreen responsive layout
overview: Introduce a responsive layout token system with three widescreen breakpoints (1536px, 1920px, 2560px) that scales content max-widths, generation card/media sizes, and content centering so the app properly fills wide and ultrawide monitors instead of clustering to the left.
todos:
  - id: tokens
    content: Add responsive widescreen breakpoints (1536px, 1920px, 2560px) with scaled --layout-content-sm/md/lg tokens in globals.css
    status: completed
  - id: forge-feed
    content: "Update ForgeGallery.module.css: feed max-width to token, add align-self: center, update .empty max-width"
    status: completed
  - id: forge-card
    content: "Update ForgeGenerationCard.module.css: card max-width to calc(var(--layout-content-sm) - 80px)"
    status: completed
  - id: prompt-bar
    content: "Update ForgePromptBar.module.css: prompt bar max-width to token"
    status: completed
  - id: dashboard
    content: "Update DashboardView.tsx: maxWidth to token, remove alignSelf: flex-start"
    status: completed
  - id: pages
    content: Update page containers (admin, analytics, docs, journeys, projects) to use layout tokens instead of hardcoded max-widths
    status: completed
  - id: verify
    content: Visual verification at 1536px, 1920px, and 2560px+ viewport widths
    status: completed
isProject: false
---

# Widescreen Responsive Layout System

## Problem

On wide screens (1536px+), content clusters to the left with large empty gaps on the right. This stems from:

- **Fixed max-widths everywhere**: Forge feed (960px), generation cards (880px), prompt bar (900px), dashboard (1400px), most pages (960px)
- **Layout tokens exist but don't scale**: `--layout-content-sm/md/lg` in [globals.css](app/globals.css) are defined as static values
- **Left-biased alignment**: Dashboard uses `alignSelf: "flex-start"`, forge gallery feed sits at `align-items: flex-start`
- **Small image previews**: The forge card grid gives the media column only `minmax(200px, 240px)` while the card itself caps at 880px -- the image column maxes out at ~624px even on a 2560px+ monitor

## Approach

### 1. Responsive layout tokens in [globals.css](app/globals.css)

Three standard min-width breakpoints that progressively scale the existing tokens:

```css
/* Default (already exists at line 56-62) */
--layout-content-sm: 960px;
--layout-content-md: 1200px;
--layout-content-lg: 1400px;

/* Large desktop -- Tailwind 2xl (1536px+) */
@media (min-width: 1536px) {
  :root {
    --layout-content-sm: 1100px;
    --layout-content-md: 1400px;
    --layout-content-lg: 1600px;
  }
}

/* Full HD / wide -- 1920px+ */
@media (min-width: 1920px) {
  :root {
    --layout-content-sm: 1280px;
    --layout-content-md: 1600px;
    --layout-content-lg: 1800px;
  }
}

/* QHD / ultrawide -- 2560px+ (Samsung Odyssey territory) */
@media (min-width: 2560px) {
  :root {
    --layout-content-sm: 1600px;
    --layout-content-md: 1920px;
    --layout-content-lg: 2200px;
  }
}
```

This single change propagates everywhere the tokens are used. Currently they are defined but underutilized -- this plan wires them in.

### 2. Apply tokens to content containers

Replace hardcoded max-widths with the responsive tokens:


| Component              | Current                 | Token                                               | File                                                                                                                                     |
| ---------------------- | ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Forge gallery feed     | `max-width: 960px`      | `var(--layout-content-sm)`                          | [ForgeGallery.module.css](components/generation/ForgeGallery.module.css) line 20                                                         |
| Forge generation card  | `max-width: 880px`      | Proportional to feed (see below)                    | [ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css) line 9                                            |
| Forge prompt bar       | `max-width: 900px`      | `var(--layout-content-sm)`                          | [ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css) line 13                                                     |
| Dashboard              | `maxWidth: 1400` inline | `var(--layout-content-lg)`                          | [DashboardView.tsx](components/dashboard/DashboardView.tsx) line 206                                                                     |
| Admin, Analytics, Docs | `max-w-[960px]`         | `max-w-[var(--layout-content-sm)]` or utility class | [admin/page.tsx](app/admin/page.tsx), [analytics/page.tsx](app/analytics/page.tsx), [documentation/page.tsx](app/documentation/page.tsx) |
| Journeys overview      | `max-w-[1200px]`        | `var(--layout-content-md)`                          | [JourneysOverviewContent.tsx](components/journeys/JourneysOverviewContent.tsx)                                                           |
| Projects               | `max-w-[960px]`         | `var(--layout-content-sm)`                          | [ProjectsView.tsx](components/projects/ProjectsView.tsx)                                                                                 |


### 3. Scale forge card media sizing (the biggest visual win)

The forge card uses `grid-template-columns: minmax(200px, 240px) minmax(0, 1fr)`. The prompt panel caps at 240px and the rest goes to media. By increasing the card's max-width, all extra width flows to the media column automatically:

- Default (960px feed): card ~880px, media column ~624px (current)
- At 1536px+ (1100px feed): card ~1020px, media column ~764px (+22%)
- At 1920px+ (1280px feed): card ~1200px, media column ~944px (+51%)
- At 2560px+ (1600px feed): card ~1520px, media column ~1264px (+103%)

The card max-width should scale proportionally with the feed. A clean approach:

```css
.card {
  max-width: calc(var(--layout-content-sm) - 80px);
}
```

This keeps the card ~80px narrower than the feed (matching the current 960-880=80px relationship), and it scales automatically with the token.

### 4. Better content centering on wide screens

- **Dashboard**: Remove `alignSelf: "flex-start"` in [DashboardView.tsx](components/dashboard/DashboardView.tsx) line 208. The `hud-shell` already uses `align-items: center`, so the dashboard will naturally center once the override is removed. At wider max-widths it will fill more of the space anyway.
- **Forge gallery feed**: Add `align-self: center` to the `.feed` rule in [ForgeGallery.module.css](components/generation/ForgeGallery.module.css) so the feed centers within the full-width workspace area rather than hugging the left edge.
- **Forge prompt bar**: Already uses `margin-left: auto; margin-right: auto` -- it will center itself at the wider max-width automatically.
- **Empty state**: The `.empty` class in ForgeGallery.module.css also has `max-width: 960px` -- update to match the token.

### 5. Secondary media components (optional stretch)

If the primary changes look good, consider scaling these at widescreen breakpoints too:

- **Image browse modal**: Grid currently maxes at `max-width: 880px` -- could reference `--layout-content-sm`
- **Convert-to-video modal**: Capped at `max-width: 960px`
- **Dashboard ImageGallery**: Grid uses `minmax(220px, 1fr)` -- could use a slightly wider minimum at 1920px+

## Token scaling summary


| Token                       | Default | 1536px+ | 1920px+ | 2560px+ |
| --------------------------- | ------- | ------- | ------- | ------- |
| `--layout-content-sm`       | 960px   | 1100px  | 1280px  | 1600px  |
| `--layout-content-md`       | 1200px  | 1400px  | 1600px  | 1920px  |
| `--layout-content-lg`       | 1400px  | 1600px  | 1800px  | 2200px  |
| Forge card (sm - 80px)      | 880px   | 1020px  | 1200px  | 1520px  |
| Media column (card - 240px) | ~624px  | ~764px  | ~944px  | ~1264px |


## Files changed (ordered by impact)

1. [app/globals.css](app/globals.css) -- Add widescreen breakpoint token overrides
2. [components/generation/ForgeGallery.module.css](components/generation/ForgeGallery.module.css) -- Feed max-width token + centering
3. [components/generation/ForgeGenerationCard.module.css](components/generation/ForgeGenerationCard.module.css) -- Card max-width token
4. [components/generation/ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css) -- Prompt bar max-width token
5. [components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx) -- Token + remove left-align override
6. [app/admin/page.tsx](app/admin/page.tsx), [app/analytics/page.tsx](app/analytics/page.tsx), [app/documentation/page.tsx](app/documentation/page.tsx) -- Token swap
7. [components/journeys/JourneysOverviewContent.tsx](components/journeys/JourneysOverviewContent.tsx), [components/projects/ProjectsView.tsx](components/projects/ProjectsView.tsx) -- Token swap

## What this does NOT change

- Small-screen breakpoints (all existing `max-width` media queries are untouched)
- HUD padding, rail widths, nav spine -- these stay as-is
- Card grid layout (prompt + media columns) -- the proportions shift naturally
- The 980px collapse to single-column cards

