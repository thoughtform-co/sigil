---
name: prompt_card_ia_restructure
overview: Restructure the shared prompt-card shell so each mode reads prompt first, then context/content, with a consistent Navigate button pattern across basic, dimensional, and semantic states.
todos:
  - id: reorder-shell-hierarchy
    content: Move the shared context/content field below the prompt-builder row across all prompt modes
    status: completed
  - id: normalize-cta-pattern
    content: Unify Navigate button placement and wrapping behavior across basic, dimensional, and semantic states
    status: completed
  - id: validate-prompt-ia
    content: Check semantic-map spacing and responsive behavior after the new prompt-first ordering
    status: completed
isProject: false
---

# Reorder Prompt Card IA

## Goal

Move the shared context/content field below the prompt-building layer in all three modes and make the `Navigate` button feel structurally consistent across the whole prompt system.

## Current Shape

The shared content field currently renders before the prompt builder, and the CTA is positioned differently depending on mode:

```87:105:components/workshops/sections/PromptPlayground.tsx
<div className={s.card} style={cardStyle}>
  {/* Shared source input */}
  <div className={s.sourceRow}>
    <label className={s.sourceLabel}>{sourceLabel}</label>
    <textarea
      className={s.sourceInput}
      value={sourceText}
      onChange={(e) => onSourceChange(e.target.value)}
      placeholder="Paste your content here…"
      rows={1}
    />
  </div>

  {/* Mode label */}
  <div className={s.modeLabel}>{modeLabel}</div>
```

```141:189:components/workshops/sections/PromptPlayground.tsx
{mode !== "dimensional" && (
  <button
    type="button"
    className={s.cta}
    style={ctaColors}
    onClick={onGenerate}
    disabled={!canGenerate}
  >
    {ctaLabel}
  </button>
)}
...
<div className={s.sliderRow}>
  <label className={s.sliderLabel}>{selectedAttribute}</label>
  <input
    type="range"
    className={s.slider}
```

## Approach

- Refactor [components/workshops/sections/PromptPlayground.tsx](components/workshops/sections/PromptPlayground.tsx) so the shared shell order becomes:
  - mode label
  - prompt-builder row
  - shared context/content field
  - mode-specific extension (`slider` or `map`)
  - output panel
- Keep the current sentence-plus-dropdown prompt builder; do not introduce a separate freeform prompt field.
- Update the shared field copy so it reads more like context/content rather than a generic preamble if that improves the information hierarchy.
- Normalize CTA placement through one shared action-row pattern in [components/workshops/sections/PromptPlayground.module.css](components/workshops/sections/PromptPlayground.module.css), so basic, dimensional, and semantic modes align to the same horizontal logic and wrap consistently on smaller screens.
- Rebalance spacing around the semantic map so the content field sits naturally between the prompt row and the visualization without making the card feel top-heavy.
- Touch [components/workshops/sections/NavigateStory.tsx](components/workshops/sections/NavigateStory.tsx) only if small prop-label adjustments are needed; this should stay primarily a prompt-shell/layout refactor.

## Files

- [components/workshops/sections/PromptPlayground.tsx](components/workshops/sections/PromptPlayground.tsx)
- [components/workshops/sections/PromptPlayground.module.css](components/workshops/sections/PromptPlayground.module.css)
- [components/workshops/sections/NavigateStory.tsx](components/workshops/sections/NavigateStory.tsx) if labels or shell props need minor cleanup

## Validation

- Verify all three modes now read prompt first, then content/context.
- Verify `Navigate` follows one consistent placement rule across basic, dimensional, and semantic layouts.
- Verify the semantic map still reads clearly after the content field moves above it.
- Verify responsive wrapping still feels deliberate and proportionate at narrower widths.

