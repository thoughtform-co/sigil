---
name: dashboard responsive followup
overview: Checkpoint the current tracked working tree on `main`, then do a focused responsive follow-up so the journeys rail gets more width on smaller laptops, route cards collapse to a single stacked column at those sizes, and wide screens use the available space more evenly.
todos:
  - id: checkpoint-current-tracked-diff
    content: Commit and push the current tracked working tree on main, excluding untracked artifacts, then wait for Vercel to go READY
    status: completed
  - id: rebalance-dashboard-columns
    content: Adjust dashboard width allocation and large-screen centering so the journeys rail gains space and the right-side margin is reduced
    status: completed
  - id: stack-routes-on-small-laptops
    content: Add an intentional smaller-laptop breakpoint that collapses route cards to a single stacked column while keeping two-up behavior on larger screens
    status: completed
  - id: verify-and-ship-followup
    content: Run browser and diagnostics checks, then commit/push the responsive follow-up and confirm the Vercel deployment succeeds
    status: completed
isProject: false
---

# Dashboard Responsive Follow-Up

First checkpoint the current tracked working tree on `main` (including `[components/admin/JourneyParticipantsPanel.tsx](components/admin/JourneyParticipantsPanel.tsx)`, per your choice) and push it, leaving generated and untracked logs, plans, and screenshots out of git. Then follow with a second, focused responsive pass so smaller laptops get a wider journeys rail and a single-column route stack, while larger screens keep a two-column route layout and stop wasting space on the right.

## Current Layout Anchors

- `[app/globals.css](app/globals.css)` already drives the workspace via `--dashboard-grid-cols-focused`, `--dashboard-content-max`, and the `1680px`, `1480px`, `1320px`, and `900px` breakpoints.
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` applies those tokens to the focused three-panel shell.
- `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)` currently uses `flexWrap: "wrap"`, so two columns happen opportunistically rather than at an explicit small-laptop breakpoint.
- `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)` caps inactive/active card widths at `280px` and `400px`, which is the main lever for how the middle panel packs cards.

## Execution Plan

1. Create a checkpoint commit from the currently modified tracked files: `[app/globals.css](app/globals.css)`, `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)`, `[components/dashboard/JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx)`, `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)`, `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`, `[components/ui/JourneyCardCompact.tsx](components/ui/JourneyCardCompact.tsx)`, `[components/ui/card/CardTitle.tsx](components/ui/card/CardTitle.tsx)`, and `[components/admin/JourneyParticipantsPanel.tsx](components/admin/JourneyParticipantsPanel.tsx)`. Leave untracked `.cursor` plans, logs, and screenshots out of the commit, push `main`, and wait for the Vercel deployment to go `READY`.
2. Tune the dashboard shell in `[app/globals.css](app/globals.css)` and `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)`:

- Increase the journeys share at the laptop breakpoints so the left panel stops feeling cropped.
- Reduce the middle and right allocation proportionally.
- Center the dashboard block on larger screens so wide monitors do not leave the extra empty space parked on the right.

1. Make the routes panel responsive in `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)` and `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)`:

- Keep the current two-up wrapping behavior on larger screens.
- Introduce a smaller-laptop breakpoint that forces a single stacked route column while preserving the active/inactive card hierarchy.
- Tighten gap and padding tokens only as much as needed so the smaller layout still feels deliberate, not cramped.

1. Recheck supporting journey chrome in `[components/dashboard/JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx)` after the width rebalance so header actions, the carousel window, and the route tree still fit cleanly inside the widened left rail.
2. Validate before the second push:

- Browser check at roughly `1366x768` and `1280x800` / `1180-1320px` widths to confirm wider journeys rail plus single-column routes.
- Browser check on a large desktop width to confirm centered content and two-column route wrapping.
- Use targeted diagnostics on touched files rather than full repo lint, since the repo already has known baseline lint noise.

1. Commit the responsive follow-up, push `main`, and again wait for the Vercel deployment to succeed before closing the task.

## Key Files

- `[app/globals.css](app/globals.css)` — dashboard grid ratios, laptop breakpoints, route card spacing tokens, content max-width behavior.
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` — applies the focused grid and the overall dashboard container sizing/alignment.
- `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)` — controls the route card stack/wrap behavior.
- `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)` — card width caps and per-card sizing behavior.
- `[components/dashboard/JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx)` — ensures the widened left rail still reads cleanly.

