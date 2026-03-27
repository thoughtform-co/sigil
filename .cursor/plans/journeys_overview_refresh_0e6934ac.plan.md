---
name: Journeys Overview Refresh
overview: "Refresh the `Journeys` page as a richer, rail-aligned overview: upgrade the cards into a middle-tier journey surface, add more hierarchy to the layout, and keep the page distinct from the dashboard’s workspace drill-down model."
todos:
  - id: rail-align-journeys
    content: Rework `JourneysOverviewContent` container/header so the `JOURNEYS` anchor aligns to the rail/content origin instead of the centered block.
    status: completed
  - id: journey-overview-card-tier
    content: Introduce a richer overview-tier journey card using shared card primitives and selective reuse from `components/journeys/JourneyCard.tsx`.
    status: completed
  - id: overview-layout-hierarchy
    content: Replace the flat uniform grid with a stronger overview composition (featured lead + secondary card matrix) while keeping the page distinct from the dashboard.
    status: completed
  - id: journeys-data-validation
    content: Validate which journey fields are worth surfacing from `lib/prefetch/journeys.ts` and avoid misleading metrics like the currently hardcoded `generationCount`.
    status: completed
isProject: false
---

# Journeys Overview Refresh

## Direction

Keep `Journeys` as an enhanced overview, not a dashboard clone. The page should feel more structured and information-rich than it does today, but still read as a browse surface rather than a selected-state workspace.

## Current Diagnosis

- The alignment mismatch is local to the page shell, not `NavigationFrame`. `JourneysOverviewContent` is centered with `margin: 0 auto`, while the dashboard grid is flush to the shell’s left content origin.
- The overview is using the thinnest journey-card tier, so it drops most of the data we already fetch.
- The dashboard feels richer mainly because it stages hierarchy spatially (`journey -> routes -> activity`), not because the base journey card is inherently much more elaborate.

```239:243:components/journeys/JourneysOverviewContent.tsx
<section
  className="w-full animate-fade-in-up"
  style={{
    maxWidth: "var(--layout-content-md, 1200px)",
    margin: "0 auto",
  }}
>
```

```45:83:components/ui/JourneyCardCompact.tsx
const statsEntries = [];
if (routeCount != null) statsEntries.push({ value: routeCount, label: "routes" });

return (
  <CardFrame /* ... */>
    <CardTitle /* ... */>{name}</CardTitle>
    <CardDivider marginTop={8} marginBottom={6} />
    {statsEntries.length > 0 && <CardStats /* ... */ />}
    {routeTree}
  </CardFrame>
);
```

## IA Approach

- Move the `JOURNEYS` anchor back to the rail/content origin by changing the page container in [components/journeys/JourneysOverviewContent.tsx](components/journeys/JourneysOverviewContent.tsx), not by changing [components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx).
- Keep the page overview-oriented: no persistent selected journey state, no dashboard-style route activity column, no workspace shell conversion.
- Introduce a **middle-tier journey card** for the overview: richer than the route `ContextAnchor`, calmer than the dashboard drill-down context.
- Add hierarchy through layout, not only through ornament. Use one stronger lead card / lead lane plus a secondary card matrix so the page has a visual “entry point” without becoming a workspace.

## Proposed Implementation

- Replace the current plain grid treatment in [components/journeys/JourneysOverviewContent.tsx](components/journeys/JourneysOverviewContent.tsx) with a rail-aligned overview container that can support:
  - a top anchor/header strip
  - one featured journey surface (spanning wider)
  - a secondary journeys grid beneath or beside it
- Build the overview card tier using the same card primitives, but with more anatomy than the current default `JourneyCardCompact` path. Two valid implementation seams:
  - extend [components/ui/JourneyCardCompact.tsx](components/ui/JourneyCardCompact.tsx) with an `overview` variant, or
  - create a dedicated [components/journeys/JourneyOverviewCard.tsx](components/journeys/JourneyOverviewCard.tsx) while reusing `CardFrame`, `CardTitle`, `CardStats`, `CardDivider`, and `CardCategory`
- Reuse the richer anatomy already present in [components/journeys/JourneyCard.tsx](components/journeys/JourneyCard.tsx):
  - category/type row
  - short description
  - image/thumb stack
  - stronger stat treatment
  - optional route preview (for example latest route or first 1–2 routes)

```24:100:components/journeys/JourneyCard.tsx
<CardCategory category={category} active={category === "learn"} gap={8} />
<CardDivider marginTop={10} marginBottom={10} />
<CardTitle /* ... */>{journey.name}</CardTitle>
{journey.description ? <p /* ... */>{journey.description}</p> : null}
<CardStats /* ... */ />
<ImageDiskStack images={journey.thumbnails} size="sm" />
```

## Data / Content Rules

- Use journey data already available from [lib/prefetch/journeys.ts](lib/prefetch/journeys.ts): `description`, `routes`, and `thumbnails`.
- Do not lean on `generationCount` unless we decide to make it real in the prefetch layer; it is still hardcoded to `0` there today.
- Prefer “overview” information: journey type, short description, route count, a thumbnail signal, and 1–2 route names. Avoid route-level operational controls that belong on the dashboard.

## Distinction From Dashboard

- Dashboard remains the command surface: selected journey, route strip, activity panel.
- Journeys becomes the browse surface: richer cards, clearer grouping, stronger first impression, but no drill-down choreography.
- This preserves the card progression you described:
  - route page: tiny `ContextAnchor`
  - journeys overview: medium overview card
  - dashboard/workspace: full drill-down context

## Validation

- `JOURNEYS` anchor sits on the same left navigation axis as the dashboard.
- Cards expose more than just title + route count and feel visually denser without becoming route cards.
- The page stays recognizably different from the dashboard.
- Responsive behavior still works cleanly at 1 / 2 / 3 columns.
- Light and dark modes maintain clear separation between background field and card surfaces.

