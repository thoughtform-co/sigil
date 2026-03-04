---
name: Dashboard rail-aligned tree
overview: Move the dashboard '01 JOURNEYS' title to align with the left rail (matching the route workspace breadcrumb position), add vertical tree connectors from the title down to each journey card, and document the grid logic for Figma.
todos:
  - id: remove-margin
    content: Remove extra left margin from DashboardView grid section so content aligns with the rail
    status: completed
  - id: journey-tree
    content: Add L-shaped tree connectors from 01 JOURNEYS title to each journey card in JourneyPanel
    status: completed
  - id: route-align
    content: Align 02 ROUTES title to rail position in RouteCardsPanel
    status: completed
  - id: grid-logic-doc
    content: Document the Navigation Tree Grid logic with Figma token mappings in the thoughtform-design skill references
    status: completed
isProject: false
---

# Dashboard Rail-Aligned Title with Tree Connectors

## Current state

The route workspace breadcrumb (`JOURNEY: THOUGHTFORM ARCS`) sits at `left: calc(var(--hud-padding) + RAIL_WIDTH + 8px)` -- right after the rail. The dashboard content sits further right due to an extra `margin-left: var(--space-2xl)` (48px) on the grid section in [DashboardView.tsx](components/dashboard/DashboardView.tsx) line 206.

## Navigation Tree Grid Logic

This is the unified rule for how titles and content connect to the left rail, mapped to the Figma design system tokens from [the TF Figma file](https://www.figma.com/design/h46nSII3A8lC7Y2eYGU7X9/TF?node-id=1-1586).

### Anchor rule

All section titles sit at **rail-edge + space-3 (8px)** from the left rail vertical line. This is the same horizontal position as the route workspace breadcrumb. In CSS: `left: calc(var(--hud-padding) + RAIL_WIDTH + 8px)`.

### Tree indent

Each child level indents by **space-4 (12px)** from its parent. Tree L-connectors are 1px `dawn-15` strokes bridging the indent gap.

- Level 0 (root title): 0px indent from anchor
- Level 1 (child title): 12px indent
- Level 2 (grandchild title): 24px indent
- Content (cards/thumbs): inherits the indent of its parent title level

### Typography mapping (Figma tokens)

- **Root title** (e.g. "JOURNEY: THOUGHTFORM ARCS"): mono-13 (13px), weight 500, dawn-50. Used for top-level context anchors.
- **Section title** (e.g. "01 JOURNEYS", "02 ROUTES"): mono-11 (11px), weight 400, gold, with bearing number. This is the `.sigil-section-label` class.
- **Sub-label** (e.g. "ROUTE: VULPIA", "IMAGE"): mono-11 (11px), weight 400, dawn-30/dawn-50. Child breadcrumb segments.

### Connector dimensions

- **Stroke**: 1px, `dawn-15` color
- **L-connector width**: 12px (matching the indent step)
- **L-connector height**: centers on the card/item midpoint
- **Vertical continuation**: 1px wide, fills gap between items
- **Item gap**: space-3 (8px) between connected items

### Spacing tokens used

From the Figma spacing scale (4px quantum, 8px structural):

- space-3 (8px): gap between tree items, rail-to-title gap
- space-4 (12px): tree indent per level
- space-5 (16px): padding inside cards, connector padding-left
- space-7 (32px): gap between major panels

## Code Changes (Dashboard page only)

### 1. Remove extra left margin from dashboard grid

In [DashboardView.tsx](components/dashboard/DashboardView.tsx), remove `margin: "0 0 0 var(--space-2xl)"` from the dashboard section. The shell's `paddingLeft` already positions content at the rail edge -- the extra 48px pushes it unnecessarily far right.

### 2. Add tree connectors to JourneyPanel

In [JourneyPanel.tsx](components/dashboard/JourneyPanel.tsx), add L-shaped tree connectors (matching the `WaypointBranch` pattern) from the "01 JOURNEYS" title down to each journey card:

- Each journey card `<div>` gets a relative position with an SVG L-connector on its left
- A vertical continuation line connects non-last items
- The card list gets a `paddingLeft` of 18px to make room for the connectors (matching `WaypointBranch`)
- The "+" create button at the end of the list also gets a connector as the final leaf

This mirrors the exact pattern from [WaypointBranch.tsx](components/hud/WaypointBranch.tsx) lines 76-130 where each session thumbnail has an L-connector and continuation line.

### 3. Apply same treatment to RouteCardsPanel

In [RouteCardsPanel.tsx](components/dashboard/RouteCardsPanel.tsx), align the "02 ROUTES" title to the rail. Since route cards are laid out horizontally, the tree connector is a single vertical-then-horizontal bridge from the title to the card area.

### 4. Document grid logic

Add a `navigation-tree-grid.md` reference file to the thoughtform-design skill at `~/.cursor/skills/thoughtform-design/references/` documenting the anchor rule, indent logic, token mappings, and connector specs. This serves as the source of truth that maps to the Figma design system page.