---
name: Responsive Layout Polish
overview: Cap brainstorm panel growth at right rail tick 5 (~305px from top), tighten HUD padding on narrower screens, and add responsive breakpoints for the prompt bar and brainstorm so everything fits cleanly at smaller widths.
todos:
  - id: brainstorm-maxheight
    content: Cap brainstorm panel max-height at right rail tick 5 level
    status: completed
  - id: hud-tighter-padding
    content: Add 1280px breakpoint to tighten HUD corner/shell padding and use CSS variable for HUD_PADDING
    status: completed
  - id: promptbar-responsive
    content: Add responsive breakpoints for prompt bar at 1100px and improve 768px
    status: completed
  - id: brainstorm-responsive
    content: Add responsive breakpoints for brainstorm panel at 1100px and 768px
    status: completed
isProject: false
---

# Responsive Layout Polish

## 1. Brainstorm panel max-height capped at right rail tick

The user confirmed the brainstorm should grow upward from its bottom anchor but stop at approximately the 5th tick on the right HUD rail (top ~305px). Currently it uses `max-height: 50vh` which is a rough approximation.

Replace with a calculated max-height that respects the rail geometry. The brainstorm bottom is at `calc(clamp(24px, 4vw, 48px) + 140px)` from viewport bottom. The top limit (tick 5) is at roughly `calc(clamp(24px, 4vw, 56px) + 32px + 25%)` of rail height. A cleaner approach: use `calc(100vh - bottom - topCap)` where `topCap` is the HUD corner + ~280px clearance.

In [BrainstormPanel.module.css](components/generation/BrainstormPanel.module.css):

- Change `max-height` to `calc(100vh - clamp(24px, 4vw, 56px) - 280px - clamp(24px, 4vw, 48px) - 140px)` -- this ensures it never crosses that tick line regardless of viewport size.

## 2. Tighter HUD padding at narrower screens

Currently `HUD_PADDING = clamp(24px, 4vw, 56px)` -- at 1280px that's ~51px per side, eating ~100px total. At smaller widths (say 1024px), that's still ~41px per side.

Add a breakpoint at `max-width: 1280px` in [globals.css](app/globals.css) that:

- Reduces `.hud-corner` positions from `clamp(24px, 4vw, 56px)` to `clamp(16px, 2.5vw, 32px)`
- Reduces `.hud-shell` padding accordingly
- The existing `max-width: 1100px` breakpoint already hides the rail ticks

Also update the `HUD_PADDING` in [NavigationFrame.tsx](components/hud/NavigationFrame.tsx) to use a CSS variable instead of a hardcoded clamp string, so the breakpoint override propagates to the JS-positioned rails too. Alternatively, add a `1280px` media query that tightens the rail inline styles.

## 3. Prompt bar responsive at narrower screens

In [ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css), add a `max-width: 1100px` breakpoint:

- Reduce `max-width` from 900px to 100% with tighter side padding
- Shrink the generate button from 48px to 40px wide
- Reduce image zone in attach row to 28px
- Reduce param pill font-size and padding slightly

At `max-width: 768px` (existing breakpoint):

- Side strip goes horizontal (already done)
- Brainstorm panel goes full-width overlay at bottom

## 4. Brainstorm responsive

In [BrainstormPanel.module.css](components/generation/BrainstormPanel.module.css):

- At `max-width: 1100px`: reduce width from 320px to 280px
- At `max-width: 768px`: panel becomes full-width, positioned at bottom above prompt bar, reduced max-height

## Files changed

- [BrainstormPanel.module.css](components/generation/BrainstormPanel.module.css) -- max-height cap, responsive breakpoints
- [ForgePromptBar.module.css](components/generation/ForgePromptBar.module.css) -- tighter spacing at narrower widths
- [globals.css](app/globals.css) -- new 1280px breakpoint for tighter HUD padding
- [NavigationFrame.tsx](components/hud/NavigationFrame.tsx) -- use CSS custom property for HUD_PADDING so media queries can override it

