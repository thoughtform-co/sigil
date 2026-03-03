---
name: Route Card Template Polish
overview: Improve the route cards with a proper structured card template (separate image area + data panel), add a dither/grain overlay to images, and widen the JourneyPanel so text is not clipped.
todos:
  - id: widen-journey
    content: Widen JourneyPanel grid column from 260px to 300px in DashboardView.tsx
    status: completed
  - id: card-template
    content: Restructure RouteCard with separate image area and data panel, show route name/description/telemetry on all cards
    status: completed
  - id: dither-overlay
    content: Add SVG-based dither/grain noise overlay on RouteCard image area with mix-blend-mode overlay
    status: completed
isProject: false
---

# Route Card Template and Dither Polish

## Problems to Fix

1. **JourneyPanel too narrow** -- The grid column is `260px` but with `16px` padding on each side, the content area is only `228px`. Long journey names get clipped.
2. **Route cards lack structured text** -- The current glassmorphism overlay sits on top of the image with minimal text. Needs a proper card template with a dedicated data panel below the image, like the cyberpunk weapon card reference.
3. **Images feel disconnected from the UI** -- Need a subtle dither/grain overlay on the card images so they blend with the dark void theme and brand tokens.

## Changes

### 1. Widen JourneyPanel

In `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)`, change the grid column from `260px` to `300px`:

```
gridTemplateColumns: "300px 1fr"
```

### 2. Redesign RouteCard with Structured Template

In `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)`, replace the current "image with glassmorphism overlay" layout with a structured two-section card template inspired by the cyberpunk weapon cards:

```
+---------------------------------------+
|  chamfered top-right corner            |
|                                        |
|       IMAGE / VIDEO AREA               |
|       (with dither grain overlay)      |
|       (~55-60% of card height)         |
|                                        |
+== thin gold separator line ============+
|                                        |
|  ROUTE NAME                            |
|  Description text (2 lines max)...     |
|                                        |
|  WPT     GEN     UPDT                  |
|  012     045     02/25                 |
|                                        |
|  diamond sockets: gold = active waypts |
|                                        |
+---------------------------------------+
   chamfered bottom-left corner
```

Key structural changes:

- **Image area** takes up the top ~55% with `aspect-ratio` removed from the parent; replaced by explicit `flex` proportions inside the clip-path container
- **Data panel** becomes a solid `var(--surface-0)` section below the image (not overlapping/glassmorphism), separated by a `1px solid var(--dawn-08)` line (upgrades to `var(--gold-30)` on active)
- **Route name** is always visible on both active AND inactive cards (currently already is, but will be more prominent at `12px` font size)
- **Description** shows on all cards (not just active), truncated to 1 line when inactive, 2 lines when active
- **Telemetry readouts** (WPT, GEN, UPDT) show on all cards, not just active
- **Diamond sockets** remain active-only

### 3. Add Dither/Grain Overlay

Add an SVG-based procedural noise texture overlaid on the image area of each `RouteCard`:

```html
<!-- Noise overlay via inline SVG feTurbulence as a CSS background-image -->
<div style={{
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: `url("data:image/svg+xml,...")`,
  opacity: 0.06,
  mixBlendMode: 'overlay',
}} />
```

This uses `feTurbulence` (fractalNoise, baseFrequency ~0.65) rendered into an inline SVG data URI, blended with `mix-blend-mode: overlay` at low opacity. This creates subtle film grain that makes the images feel organic within the void background.

## Files to Change

- `[components/dashboard/DashboardView.tsx](components/dashboard/DashboardView.tsx)` -- Widen grid column from `260px` to `300px`
- `[components/dashboard/RouteCard.tsx](components/dashboard/RouteCard.tsx)` -- Restructure card layout (image area + data panel), add dither overlay, show text on all cards

