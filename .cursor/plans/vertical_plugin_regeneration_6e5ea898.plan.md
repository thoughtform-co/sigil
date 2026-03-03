---
name: Vertical Plugin Regeneration
overview: Shift Sigil’s Figma plugin generation output to a vertical layout and make regeneration destructive-safe so you can clear existing generated artifacts and rerun cleanly.
todos:
  - id: vertical-layout-orchestrator
    content: Refactor plugin orchestrator to compute vertical section placement and deterministic section order
    status: completed
  - id: clean-regenerate-mode
    content: Add safe clean-replace regeneration behavior for existing generated design-system output
    status: completed
  - id: ui-command-surface
    content: Expose clean regen action in plugin command routing/UI
    status: completed
  - id: idempotence-check
    content: "Validate rerun behavior: no duplicates, stable vertical layout"
    status: completed
  - id: docs-sync
    content: Update design-system documentation to reflect vertical codex structure and added HUD Rail/Nav Spine sections
    status: completed
isProject: false
---

# Vertical Re-Run Plan

## Goal

Support your preferred workflow: **wipe generated design-system output, rerun plugin, get vertically stacked sections**.

## Implementation Approach

- Update the plugin generator to use a **vertical section layout** instead of horizontal.
- Add a **replace/clean regeneration mode** so existing generated sections are removed before new output is created.
- Keep this scoped to generated design-system artifacts, not unrelated Figma content.

## Files to Update

- `[packages/figma-plugin/src/generateDesignSystem.ts](packages/figma-plugin/src/generateDesignSystem.ts)`
  - Centralize layout ordering and coordinates
  - Switch section placement to vertical stacking with fixed gap
- `[packages/figma-plugin/src/generators/*.ts](packages/figma-plugin/src/generators)`
  - Ensure each generator reports frame size/position contract used by orchestrator
- `[packages/figma-plugin/code.ts](packages/figma-plugin/code.ts)`
  - Add/route a command for clean regen (remove generated nodes + regenerate)
- `[packages/figma-plugin/ui.html](packages/figma-plugin/ui.html)`
  - Optional toggle/button: "Regenerate (Replace Existing)"
- `[packages/figma-plugin/manifest.json](packages/figma-plugin/manifest.json)`
  - Add command label(s) if new command is exposed in plugin menu

## Regeneration Safety Rules

- Only delete inside the plugin’s generated design-system scope (e.g., target page and/or nodes tagged by plugin metadata).
- Avoid deleting user-authored or manually curated frames outside that scope.
- If no generated markers exist, fallback to replacing known generated section names only.

## Vertical Layout Spec

- Single column, aligned at `x = 0` (or consistent left margin)
- Deterministic section order:
  - Typography
  - Colors
  - Spacing
  - Buttons
  - Components
  - Particle Icon Grammar
  - HUD Rail (new section when available)
  - Nav Spine (new section when available)
- Consistent inter-section gap (e.g., 200px)

## Validation

- Run plugin on a file that already has generated content:
  - Old generated sections are removed
  - Fresh vertical stack is produced in correct order
  - Running again is idempotent (same layout, no duplicates)

## Documentation Alignment

- Update design-system references to match the new vertical codex structure and include HUD Rail/Nav Spine as first-class documented sections.

