---
name: Rail Tick Rhythm Fix
overview: Recalculate navigation rail tick spacing so major ticks (2/5/7) and corner segments are evenly spaced, with five minor ticks between each major marker, and apply the same rhythm to both left and right rails.
todos:
  - id: define-segmented-tick-math
    content: Refactor tick constants in `NavigationFrame.tsx` to use equal rail segments and five minor ticks between major markers
    status: completed
  - id: update-left-right-rail-rendering
    content: Update both rail loops to use new major index mapping while preserving existing styles and right-rail major animation class
    status: completed
  - id: verify-visual-balance
    content: Run a quick visual check to confirm equal spacing from corners and between major ticks, with 5 minor ticks in each segment
    status: completed
isProject: false
---

# Rebalance Navigation Rail Ticks

## Goal

Adjust the rail tick algorithm so spacing is visually balanced:

- Corner-to-first-major spacing equals major-to-major spacing.
- There are exactly **5 minor ticks** between each pair of major ticks.
- Left and right rails stay in sync.

## File To Update

- [components/hud/NavigationFrame.tsx](components/hud/NavigationFrame.tsx)

## Planned Changes

1. Replace the current hard-coded tick rhythm (`TICK_COUNT = 20`, major every 5) with a segment-based rhythm.
  - Define rail geometry from intent instead of implicit modulo math:
    - 4 equal segments: `corner -> 2 -> 5 -> 7 -> corner`
    - 6 gaps per segment (5 minor ticks + 1 major boundary)
    - Derived total tick count: `24` gaps, `25` tick positions (`0..24`)
2. Re-map major label indices to the new evenly spaced positions.
  - New major positions: `6`, `12`, `18`
  - Labels: `6 -> "2"`, `12 -> "5"`, `18 -> "7"`
  - Keep corner endpoints unlabeled.
3. Apply the same major/minor detection to both rail render loops.
  - Left rail: numbered majors and minor ticks.
  - Right rail: same major locations; keep `.rail-major-tick` class behavior for scroll reveal unchanged.
4. Keep existing visual style (tick widths/colors) while changing only spacing math.
  - No CSS changes expected in [app/globals.css](app/globals.css).

## Verification

- Confirm visually that:
  - Distance `top-corner -> 2` equals `2 -> 5` equals `5 -> 7` equals `7 -> bottom-corner`.
  - Each segment has 5 minor ticks.
  - Right rail majors still fade in on scroll as before.

