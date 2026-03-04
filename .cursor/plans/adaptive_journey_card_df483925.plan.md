---
name: Adaptive Journey Card
overview: Evolve JourneyCardCompact into an adaptive primitive with three size modes (default, compact, mini) where the compact mode shows journey name + current route name + condensed stats for use in the route workspace nav spine.
todos:
  - id: add-compact-size
    content: Add compact size variant and routeName prop to JourneyCardCompact
    status: completed
  - id: use-compact-in-spine
    content: Replace mini card in NavigationFrame with compact variant showing route name
    status: completed
  - id: simplify-child-segments
    content: Remove redundant route label from breadcrumb segments, keep only mode label below the card
    status: completed
  - id: update-brand-docs
    content: Update navigation-tree-grid.md and components.md references with the adaptive JourneyCardCompact primitive spec (three sizes, routeName prop, Figma mapping)
    status: completed
isProject: false
---

# Adaptive Journey Card Primitive

## Current state

`JourneyCardCompact` in [components/ui/JourneyCardCompact.tsx](components/ui/JourneyCardCompact.tsx) has two sizes: `default` (Dashboard, Journeys page) and `mini` (route nav spine). The mini variant is too small and only shows the journey name -- it doesn't display the current route name or any stats.

Inside a route, the user wants to see a card that feels like the Dashboard card but adapted: journey name, the **current route name** (not a count), and condensed stats.

## Changes

### 1. Add `compact` size variant and `routeName` prop to `JourneyCardCompact`

File: [components/ui/JourneyCardCompact.tsx](components/ui/JourneyCardCompact.tsx)

- Add `"compact"` to the `size` union: `"default" | "compact" | "mini"`
- Add optional `routeName?: string` prop
- `compact` layout:
  - Padding: `8px 12px 12px` (between default and mini)
  - Shows category diamond row (same as default)
  - Shows divider (same as default)
  - Shows journey name as title
  - Below the name: if `routeName` is provided, render it as a secondary line in `dawn-50`, 10px
  - Shows stats row (route count, gen count) -- same as default but slightly smaller font

This keeps the card as a single primitive that adapts its density based on context.

### 2. Use `compact` size in route nav spine

File: [components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)

Replace the current `<JourneyCardCompact size="mini">` with:

```tsx
<JourneyCardCompact
  as={Link}
  href={breadcrumb.segments[0].href}
  name={journeyName}
  routeName={routeName}
  size="compact"
  style={{ maxWidth: 240 }}
/>
```

This replaces the plain text ROUTE/IMAGE labels below the card since the route name is now **inside** the card. The tree connector `<ul>` for child segments can be simplified to only show the mode label (IMAGE/VIDEO/CANVAS) as a single indented text element below the card.

### 3. Remove redundant route/mode text labels

In the same breadcrumb section of [NavigationFrame.tsx](components/hud/NavigationFrame.tsx), when `journeyName` is present (route workspace), simplify the child segment list:

- Remove the `route ${routeName}` segment (it's now inside the card)
- Keep only the mode segment (`image`, `video`, `canvas`) as a small indented gold label below the card
- This eliminates the cascading tree that felt disorderly

### 4. Update brand architecture references

Two design system reference files need updating to document the adaptive card primitive:

**File: [navigation-tree-grid.md](~/.cursor/skills/thoughtform-design/references/navigation-tree-grid.md)**

- Update the "Route Workspace" pattern section to reflect the new compact card replacing the text labels
- Add the adaptive card as a tree grid element that can contain hierarchy within itself

**File: [components.md](~/.cursor/skills/thoughtform-design/references/components.md)**

- Add a new component entry for `JourneyCardCompact` as a Thoughtform primitive
- Document the three size variants (default, compact, mini) with their token mappings
- Include the `routeName` adaptive content behavior
- Map to Figma structure: auto-layout frame with category row, divider, name, optional route name, optional stats
- Reference the [TF Figma file](https://www.figma.com/design/h46nSII3A8lC7Y2eYGU7X9/TF?node-id=1-1586) for where this should be added as a component in the design system page

This ensures the Figma design system stays in sync when it's updated via Claude Code later.

