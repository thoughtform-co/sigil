---
name: mycelial loading network
overview: Replace the rigid circuit-trace grid in `SigilLoadingField` with an organic, branching mycelial network that grows outward from center using dotted pixel trails and junction nodes, while keeping progress-driven expansion and the text safe zone.
todos:
  - id: mycelial-scene-gen
    content: Replace createCircuitScene with a recursive branching algorithm that grows organic stems outward from center with seeded angular wobble and forking.
    status: completed
  - id: dotted-trail-render
    content: Update drawTrace to render dotted pixel trails with depth-based spacing and drift-layer displacement for brand consistency.
    status: completed
  - id: verify-mycelial
    content: Typecheck, lint, and visually confirm the organic network fills the frame progressively while keeping the text zone clear.
    status: completed
isProject: false
---

# Mycelial Loading Network

## What Changes

Rewrite the scene generation and rendering in [components/generation/SigilLoadingField.tsx](components/generation/SigilLoadingField.tsx) to replace the current rigid circuit-board layout (straight horizontal/vertical bus lines on a fixed grid) with a branching, organic network that grows outward from center -- like mycelia or a neural network forming.

## Current Problem

The current `createCircuitScene()` builds ~24 hand-placed traces along fixed horizontal/vertical bus lines (upper/lower hub, left/right edges, cap rails). These render as solid pixel-filled lines that feel mechanical and grid-locked rather than alive and growing.

## New Approach: Recursive Branch Generation

Replace `createCircuitScene()` with a recursive branching algorithm:

- **Root**: Start from center `(cx, cy)`. Spawn 4-6 initial stems in seeded-random radial directions (not locked to cardinal axes).
- **Growth**: Each stem walks outward in its general direction, snapping to the pixel grid, but allowing slight angular wobble at each step (like a hypha seeking nutrients). At random intervals (seeded), a stem forks into 1-2 child branches at a divergent angle.
- **Depth limit**: Cap recursion at 4-5 levels to keep the particle count manageable (~120-180 total trail pixels + nodes).
- **Junction nodes**: Where a branch forks, place a brighter junction node (diamond-shaped: the center pixel plus 4 cardinal neighbors, matching the existing `drawActiveTip` cross pattern). These are the "neurons" or "mycelium nodes."
- **Distance-based delay**: Each branch inherits its parent's delay plus a small increment proportional to its distance from center, so the network reveals outward progressively with the generation timer.
- **Text safe zone**: Branches that enter the center text band get their alpha faded to near-zero (same `inSafeZone` logic), so the phase message stays readable.

## Dotted Pixel Trails (not solid lines)

The key visual change: trails are **dotted**, not solid.

- Instead of filling every `GRID`-step pixel along a trail, fill every **other** pixel (step = `GRID * 2` or `GRID * 3` depending on branch depth).
- Deeper branches use sparser dots (wider spacing), inner stems use denser dots. This creates a natural density gradient from center to edge.
- Each dot is a single `fillRect(x, y, size, size)` call using the existing `GRID` and `snap()` system, so it stays consistent with the Thoughtform particle icon grammar.
- The "drift" layer from the particle grammar applies here too: ~10% of trail pixels get displaced by 1 grid unit perpendicular to the trail direction, at lower alpha (0.4-0.55). This breaks the mechanical regularity and adds the brand's human+machine tension.

## Rendering Changes

- `drawTrace()` gains a `dotSpacing` parameter. Instead of stepping at `TRACE_STEP` (every 3px), it steps at `dotSpacing` (6-9px depending on branch depth) and only renders pixels at those intervals.
- Junction nodes pulse more prominently than trail pixels (higher base alpha, slightly larger cross pattern).
- Active tips at the growth frontier get a brighter glow pixel with 4-neighbor cross, same as now but applied to the organic branch tips.
- The safe-zone brackets and center crosshair remain unchanged.

## What Stays the Same

- Props interface (`seed`, `createdAt`, `modelId`)
- Duration estimation (`estimateGenerationSeconds`)
- Asymptotic progress curve (`1 - 1/(1 + raw * 1.8)`)
- Canvas setup, DPR handling, resize listener
- Text safe zone dimensions and fade logic
- Gold/dawn color system and pulse/breathe alpha modulation
- `snap()`, `clamp()`, `seededRandom()` utilities

## File Target

- [components/generation/SigilLoadingField.tsx](components/generation/SigilLoadingField.tsx) -- single file rewrite of scene generation + trail rendering. No other files change.

