---
name: dashboard shared responsive sweep
overview: Rework the dashboard breakpoint ladder and the shared journey shell sizing so the middle panel stops dominating smaller screens, the side panels keep breathing room longer, and single-column states scale proportionately instead of collapsing abruptly.
todos:
  - id: audit-dashboard-and-shared-ladder
    content: Map the dashboard and shared journey-shell breakpoint ladder and identify the center-dominant transitions to replace
    status: completed
  - id: rebalance-workspace-shell
    content: Adjust dashboard grid ratios, shell sizing, and HUD inset behavior so left and right panels retain breathing room longer
    status: completed
  - id: refit-routes-and-stacked-states
    content: Rework route panel/card sizing so tighter widths stack earlier and single-column states scale proportionately
    status: completed
  - id: align-shared-journey-shell
    content: Bring the adjacent journey detail shell onto the same responsive token and collapse logic where appropriate
    status: completed
  - id: verify-responsiveness-ranges
    content: Visually verify the updated ladder across desktop, smaller-laptop, and single-column widths and fix any resulting layout regressions
    status: completed
isProject: false
---

# Dashboard And Shared Responsive Sweep

This pass will stay focused on the dashboard workspace and the shared shell/token layer around journeys, not a full repo-wide normalization of every ad-hoc breakpoint. The current dashboard pressure comes from `[app/globals.css](app/globals.css)`, where the middle track still gets the largest share in the smaller-laptop range, and from adjacent shell files that use separate fixed widths and collapse rules.

## Current Hotspots

- `[app/globals.css](app/globals.css)` owns the full dashboard ladder: `1680`, `1480`, `1320`, `1024`, and `900`, plus `--dashboard-content-max`, `--dashboard-grid-cols-focused`, and `--route-cards-*`.
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` applies that ladder via `gridTemplateColumns: var(--dashboard-grid-cols-focused, ...)` and the centered `maxWidth` shell.
- `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)` and `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)` determine when the routes panel wraps vs stacks and how wide the route cards remain in each mode.
- `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)` controls the shared workspace shell inset/padding that influences how much room the dashboard actually gets inside the HUD.
- `[components/journeys/JourneyDetailContent.tsx](components/journeys/JourneyDetailContent.tsx)` and `[app/journeys/[id]/JourneyShell.module.css](app/journeys/[id]/JourneyShell.module.css)` are the adjacent shared journeys surfaces still using their own content caps and a separate `860px` collapse, so they should be aligned with the same proportional logic.

## Planned Changes

1. Re-audit and simplify the dashboard ladder in `[app/globals.css](app/globals.css)`:

- Reduce the middle panel’s dominance in the smaller-laptop range.
- Give both side panels stronger minimum space before any collapse.
- Smooth the transition from 3-column to 1-column so there is no single breakpoint where the center suddenly feels oversized or the side panels feel starved.

1. Refit the dashboard container and shared shell behavior in `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` and `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`:

- Check whether the HUD inset and content max-width are visually biasing the workspace away from center.
- Keep the workspace visually centered while still honoring the navigation frame.
- Make sure the left and right rails gain usable breathing room instead of only shrinking the center mathematically.

1. Rework the routes panel scaling in `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)` and `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)`:

- Keep large screens two-up where it still reads well.
- On tighter widths, stack routes earlier and let the cards refill the narrower middle panel more proportionately.
- On the 1-column state, resize the route cards and panel padding so the middle panel no longer feels like a fixed-size leftover dropped into a stacked layout.

1. Align the adjacent journeys shell with the same responsiveness principles in `[components/journeys/JourneyDetailContent.tsx](components/journeys/JourneyDetailContent.tsx)` and `[app/journeys/[id]/JourneyShell.module.css](app/journeys/[id]/JourneyShell.module.css)`:

- Replace the standalone `1200px` / `860px` behavior with the shared content-width token system where appropriate.
- Make the journey detail split view collapse and breathe in a way that matches the dashboard rather than feeling like a separate breakpoint philosophy.

1. Verify the sweep across representative ranges:

- Large desktop where the dashboard should stay centered without wasting the right side.
- Smaller laptops where left and right rails should both remain usable and the routes panel should stop dominating.
- Single-column widths where all panels should refit proportionately instead of preserving oversized middle-panel assumptions.

## Key Files

- `[app/globals.css](app/globals.css)`
- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)`
- `[components/dashboard/RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx)`
- `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)`
- `[components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)`
- `[components/journeys/JourneyDetailContent.tsx](components/journeys/JourneyDetailContent.tsx)`
- `[app/journeys/[id]/JourneyShell.module.css](app/journeys/[id]/JourneyShell.module.css)`

