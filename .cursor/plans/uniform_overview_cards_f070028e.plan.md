---
name: uniform overview cards
overview: Replace the `JourneyOverviewCard` cards in the expanded overview mode with `JourneyCardCompact` — the same component used in the focused mode's left panel — so both states render visually identical journey cards.
todos:
  - id: swap-overview-cards
    content: In the overview branch of `DashboardView`, replace `JourneyOverviewCard` with `JourneyCardCompact` wrapped in `Link`, using the same props pattern as `JourneyPanel` but without selection state or route tree expansion.
    status: completed
isProject: false
---

# Uniform Overview Cards

## Problem

The overview mode in [components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx) renders `JourneyOverviewCard` which has a different visual style (category badges like "LEARN"/"CREATE", descriptions, featured variant) compared to the `JourneyCardCompact` cards in the focused mode's `JourneyPanel`.

## Fix

Single change in [components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx):

- Replace the `JourneyOverviewCard` usage in the `isOverview` branch with `JourneyCardCompact` wrapped in `Link`
- Remove the `featured` first-card treatment (no reason for one card to be wider when they all use the same compact style)
- Map journey data to `JourneyCardCompact` props: `name`, `type`, `routeCount`, `href`
- Remove the `JourneyOverviewCard` import and the `overviewJourneys` mapping (which builds a `JourneyCardItem[]` for the old card type)
- Layout: a simple responsive grid of uniform `JourneyCardCompact` cards instead of the featured-lead + secondary-grid composition

## Props Mapping

`JourneyCardCompact` accepts:

```
name: string
type?: string          // "learn" | "create"
routeCount?: number
href?: string          // wraps in Link internally
state?: CardState      // "default" for all (no selection in overview)
```

So the overview grid becomes:

```tsx
{data.journeys.map((j) => (
  <JourneyCardCompact
    key={j.id}
    name={j.name}
    type={j.type}
    routeCount={j.routeCount}
    href={`/journeys/${j.id}`}
  />
))}
```

## What Stays

- The chevron disclosure toggle and its behavior
- The `SectionHeader` with `JOURNEYS` label, disclosure button, and admin `+`
- The unified workspace shell
- Selection state preservation across mode switches

