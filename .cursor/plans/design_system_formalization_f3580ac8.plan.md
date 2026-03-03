---
name: Design system formalization
overview: Bridge the gap between the documented Thoughtform design system (10 theoretical primitives) and the actual patterns that have organically emerged in the Sigil codebase, then expand both into a formalized, Figma-ready component library.
todos:
  - id: doc-components
    content: Update references/components.md with 6 new emerged patterns (CategoryRow, ParticleIcon, HoverCornerAccents, ChamferedPanel, BackLink, InlineAction) and the canonical card anatomy
    status: completed
  - id: doc-particle
    content: Add ParticleIcon as 11th grammar primitive in SKILL.md and navigation-grammar.md
    status: completed
  - id: token-spec-v1
    content: Add Token Spec v1 from Figma nodes 1:11, 1:13, and 1:6 (hybrid spacing, typography intervals, button variant matrix)
    status: completed
  - id: layout-tokens
    content: Add formalized layout tokens to globals.css (--layout-sidebar, --layout-content-sm/md/lg, --layout-card-min)
    status: completed
  - id: extract-diamond
    content: Extract Diamond component to components/ui/Diamond.tsx
    status: completed
  - id: extract-particle
    content: Extract ParticleIcon component to components/ui/ParticleIcon.tsx with glyph variants
    status: completed
  - id: extract-section-label
    content: Extract SectionLabel component to components/ui/SectionLabel.tsx with optional bearing
    status: completed
  - id: extract-card-frame
    content: Extract CardFrame component to components/ui/CardFrame.tsx with hover corners
    status: completed
  - id: extract-category-row
    content: Extract CategoryRow component to components/ui/CategoryRow.tsx
    status: completed
  - id: extract-back-link
    content: Extract BackLink component to components/ui/BackLink.tsx
    status: completed
  - id: fix-duration-tokens
    content: Correct --duration-fast/base/slow to match brand spec (80/120/150ms) and audit consumers for regressions
    status: completed
  - id: refactor-consumers
    content: Update JourneyCard, JourneyPanel, and page.tsx to use extracted components
    status: completed
  - id: sigil-plugin-scaffold
    content: Scaffold standalone Sigil Figma Plugin at packages/figma-plugin/ (manifest, esbuild, entry, UI)
    status: completed
  - id: sigil-plugin-tokens
    content: Create thoughtformTokens.ts with all design token values compiled into the plugin
    status: completed
  - id: sigil-plugin-generators
    content: Implement 6 specimen frame generators (typography, spacing, colors, buttons, components, particle grammar)
    status: completed
  - id: sigil-plugin-styles
    content: Create Figma Paint Styles and Text Styles from token data via plugin
    status: completed
  - id: sigil-plugin-components
    content: Create Figma Component Sets for Diamond, ParticleIcon, Button, etc. via plugin
    status: completed
isProject: false
---

# Design System Formalization

## The Gap

The Thoughtform design skill documents **10 grammar primitives** and **10 starter components**, but these were written as aspirational specs. Meanwhile, the Sigil codebase has organically grown **12+ inline patterns** that are real, battle-tested, and not captured anywhere. The documented system and the actual system have diverged.

**Documented but never extracted into reusable React components:**

- FramePanel, NavTab, LabelNav, DataReadout, StatusBar, ActionButton, TextField, Divider, EventCard, DiamondMarker

**Emerged organically, NOT documented:**

- ParticleArrowIcon, CategoryRow (label + divider above title), HoverCornerAccents, ChamferedCard, ScanlineOverlay, NoiseOverlay, TelemetryRail (on cards), DiamondSocket row, ThreeDotMenu, BackLink, InlineAction buttons, Particle icon system (logo, settings, theme, arrows)

The goal is to reconcile these into a single source of truth that works for both code and Figma.

---

## Phase 1: Audit and Document What Exists

Update the `thoughtform-design` skill references to capture what has actually been built. This is the foundation — no new components, just accurate documentation.

### 1a. Update `references/components.md` with real components

Add new entries for patterns that have emerged but aren't documented:

- **CategoryRow** — Diamond marker + uppercase label above a course-line divider. Used in JourneyCard and JourneyPanel to identify journey type. Grammar: Waypoints + Course Lines + Data Readouts.
- **ParticleIcon** — Pixel-art SVG icons built from small rectangles on a 2-3px grid. Variants: logo (diamond+cross), arrow (opacity gradient trail), settings (cross+dots), theme (sun/moon). Grammar: Compass Anchor + Waypoints.
- **HoverCornerAccents** — Four absolute-positioned L-brackets that appear on card hover. 14px arms, 1px gold borders. Grammar: Viewport Frame (card preset).
- **ChamferedPanel** — Container with clip-path polygon corners (12-14px chamfer). Used in RouteCard and ImageDiskStack. Grammar: Viewport Frame + Depth Layers.
- **BackLink** — Compact `<- label` navigation link. Mono, uppercase, 10px, dawn-40 with gold hover. Replaces breadcrumbs when top nav already provides context.
- **InlineAction** — Small button placed next to a section title or page title. Pattern: `+` character or diamond + label. Borderless or subtle border. Used for create actions.

### 1b. Document the actual card anatomy

The JourneyCard has established a card anatomy that should be the canonical pattern:

```
+------------------------------------------+
| [diamond] CATEGORY                  [...] |  <- CategoryRow + hover menu
|------------------------------------------|  <- Course Line divider
| TITLE                           [->icon] |  <- Title + ParticleArrow
|                                          |
| Description text                         |  <- Optional body
|                                          |
| 3 routes  ·  12 generations             |  <- DataReadout row
+------------------------------------------+
```

This anatomy maps to grammar primitives:

- Top zone: Waypoint (diamond) + Data Readout (category) + optional admin actions
- Divider: Course Line
- Title zone: Heading text + navigation affordance (ParticleArrow)
- Body zone: Description (Signal Strength hierarchy)
- Footer zone: Data Readouts (metrics)

### 1c. Document the particle icon grammar

The particle system has emerged as a distinctive Thoughtform primitive not in the original 10. It deserves its own entry:

- **Grid**: 2-3px pixel grid, `imageRendering: pixelated`
- **Construction**: Small `<rect>` elements in SVG, no strokes
- **Color**: `currentColor` for inheritance, or explicit gold
- **Opacity gradient**: Trailing particles fade (0.45 -> 0.6 -> 0.8 -> 1.0) to suggest motion
- **Sizes**: 12x12 (inline), 18x18 (nav controls), 32x32 (logo)
- **Animation**: Optional pulse (`opacity 0.48 -> 1`, 2s ease-in-out infinite)

**File:** [C:\Users\buysscursor\skills\thoughtform-design\references\components.md](references/components.md)

---

## Phase 2: Extract Reusable React Components

Create actual React components for the most-repeated inline patterns. Priority order based on duplication count:

### High priority (used 3+ times inline)

1. `**<Diamond />`** — Already exists in JourneyPanel but inline. Extract to `components/ui/Diamond.tsx`. Props: `size` (sm/md/lg), `color` (gold/inactive/neutral/alert), `active` (boolean shorthand).
2. `**<ParticleIcon />`** — Consolidate ParticleArrowIcon, ParticleOpenIcon, SigilParticleLogo pixel generation into a single system. Props: `glyph` (arrow/logo/settings/theme/open), `size`, `active`. File: `components/ui/ParticleIcon.tsx`.
3. `**<SectionLabel />`** — The `.sigil-section-label` class is used everywhere with bearing numbers. Extract to component with optional bearing prop. Props: `bearing?` (string like "01"), `children`. File: `components/ui/SectionLabel.tsx`.
4. `**<CardFrame />`** — The hover-corner-accent + surface-0 + dawn-08 border pattern repeats in JourneyCard, RouteCard (journeys), and ProjectCard. Extract the frame + 4 hover corners. Props: `as` (Link/button/div), `href?`, `onClick?`, `chamfer?` (boolean). File: `components/ui/CardFrame.tsx`.

### Medium priority (used 2 times inline)

1. `**<CategoryRow />`** — Diamond + label + divider. Used in JourneyCard and JourneyPanel. Props: `category`, `active?`. File: `components/ui/CategoryRow.tsx`.
2. `**<BackLink />`** — `<- label` pattern. Used in journey detail page, could be used in route pages. Props: `href`, `label`. File: `components/ui/BackLink.tsx`.

---

## Phase 3: Define the Grid System

The layout system needs formalization. Currently there are 5 distinct layout modes used across the app:

### Layout archetypes

1. **HUD Viewport** — The outermost frame. Corner brackets, rails, top nav. Already formalized in NavigationFrame. No changes needed, but document the content area dimensions.
2. **Two-Panel Dashboard** — Fixed left panel (300px) + flexible right panel. Used on `/dashboard`. Gap: 24px. Max-width: 1400px.
3. **Content Page** — Single centered column. Max-width varies: 960px (lists), 1200px (detail pages). Used on `/journeys`, `/journeys/[id]`, `/analytics`.
4. **Workspace** — Full viewport height, internal scroll. Used on `/routes/[id]/image`. No max-width constraint.
5. **Card Grid** — Auto-fill responsive grid. `repeat(auto-fill, minmax(Xpx, 1fr))`. Two size presets: standard (200px min) and wide (260px min).

### Responsive breakpoints (formalize)


| Breakpoint | What changes                          |
| ---------- | ------------------------------------- |
| 1280px     | HUD padding shrinks                   |
| 1100px     | Navigation rails hide                 |
| 900px      | Two-panel collapses to single column  |
| 860px      | Content two-column collapses          |
| 600px      | HUD corners shrink, dialog fullscreen |
| 500px      | Card grid goes single column          |


### Proposed: add layout tokens to CSS

```css
--layout-sidebar: 300px;
--layout-content-sm: 960px;
--layout-content-md: 1200px;
--layout-content-lg: 1400px;
--layout-card-min: 200px;
--layout-card-min-wide: 260px;
```

---

## Token Spec v1 (Figma aligned, Thoughtform native)

This spec folds in the extracted intervals from Figma nodes `1:11` (typography), `1:13` (spacing), and `1:6` (buttons), then adapts them to the current Thoughtform stack.

### Spacing scale (4px quantum with micro-step support)

- Core rhythm: 4px base + 8px structural cadence.
- Adopt exact scale: `0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160`.
- Add numeric tokens in [C:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\app\globals.css](app/globals.css): `--space-0` through `--space-14` mapped to the values above.
- Preserve existing semantic aliases (`--space-xs/sm/md/lg/...`) but re-map them to numeric tokens to avoid breaking current components.
- Usage intent:
  - `2-4`: icon breathing room, pixel accents, telemetry separators
  - `8-16`: control paddings, row gaps, card inner rhythm
  - `24-40`: section spacing and grid gaps
  - `48+`: page-level vertical rhythm and major stack separation

### Typography intervals (dual-track system)

- UI track: `12, 14, 16, 20, 24` for dense interface text.
- Display track: `34, 48, 60, 96` for hero/readout moments.
- Add numeric type tokens in [C:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\app\globals.css](app/globals.css): `--type-0: 12px` ... `--type-8: 96px`.
- Keep family mapping Thoughtform-native:
  - UI labels/navigation: `var(--font-mono)`
  - Body/long-form text: `var(--font-sans)`
  - Display/emphasis: `var(--font-display)`
- Add line-height tokens:
  - `--leading-tight` for display (`~1.08-1.2`)
  - `--leading-ui` for controls (`~1.25-1.35`)
  - `--leading-body` for reading (`~1.45-1.6`)
- Add tracking tokens from Figma logic:
  - `--tracking-normal: 0`
  - `--tracking-ui: 0.0125em` (buttons and compact controls)
  - `--tracking-caps: 0.04em` (small uppercase labels/captions)

### Button architecture (variant matrix)

- Formalize one component API in [C:\Users\buyss\Manifold Delta\Artifacts\05_sigil.thoughtform\components\ui](components/ui):
  - `variant`: `primary | secondary | stroke | transparent`
  - `size`: `sm | md | lg`
  - `state`: `default | hover | active | disabled | loading`
  - `tone`: `onDark | onLight`
  - `iconOnly`: `true | false`
- Mirror Figma matrix behavior while staying token-driven (no one-off inline colors/sizes).
- Define canonical heights/padding from spacing scale:
  - `sm`: compact HUD controls
  - `md`: default app action size
  - `lg`: high-emphasis CTA size
- Keep particle/diamond affordances as optional slots, not separate button components.

### Migration rules

- Do not hardcode raw pixel values for spacing/type in new UI work unless outside token scale.
- Any component extraction in this plan must consume Token Spec v1 variables first, then semantic aliases where needed.
- Existing pages can migrate incrementally, but new components (`Diamond`, `ParticleIcon`, `SectionLabel`, `CardFrame`, `CategoryRow`, `BackLink`) should launch on v1 tokens from day one.

---

## Frontend Audit: Current Token Landscape (globals.css)

Pre-implementation findings from auditing [app/globals.css](app/globals.css) against the brand spec and Token Spec v1.

### 1. Spacing aliases are drifted from brand spec

Current values:

```css
--space-xs: 8px;  --space-sm: 12px;  --space-md: 16px;
--space-lg: 20px;  --space-xl: 24px;  --space-2xl: 32px;
```

The brand skill documents `xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48` — a different mapping. Additionally `--space-lg: 20px` is off the 4px quantum grid. When Token Spec v1 adds the numeric scale (`--space-0` through `--space-14`), the semantic aliases must be corrected to match the brand spec. This will require a consumer audit (search for `var(--space-lg)` etc.) to catch any layout shifts from the value change.

### 2. Duration tokens are 2x slower than brand motion spec

Current values:

```css
--duration-fast: 150ms;  --duration-base: 300ms;  --duration-slow: 500ms;
```

Brand motion system specifies: `fast=80ms`, `normal=120ms`, `slow=150ms`, with a hard rule that UI state changes never exceed 150ms. The current `--duration-fast` (150ms) equals the brand's `slow`. Every hover/focus/toggle in the codebase is running at double the intended speed. Correction:

```css
--duration-fast: 80ms;
--duration-base: 120ms;
--duration-slow: 150ms;
```

This is a high-impact change — all transition-using elements reference these tokens. Should be done as a dedicated step with visual QA.

### 3. No typography size, tracking, or line-height tokens exist

All font sizes are hardcoded inline (`9px`, `10px`, `11px`, `12px`, `13px`, `18px`). Letter-spacing is hardcoded (`0.08em`, `0.1em`, `0.12em`). Token Spec v1 will introduce `--type-*`, `--tracking-*`, and `--leading-*` as entirely new variables. No conflict risk, only adoption effort.

### 4. Three button classes exist but don't cover the full matrix

`.sigil-btn-primary`, `.sigil-btn-secondary`, `.sigil-btn-ghost` roughly map to `primary`, `secondary`, `transparent` in the Figma variant matrix. Missing: `stroke` variant, `sm/md/lg` sizing, `iconOnly` mode, `onLight` tone. The component extraction step should unify these under a single `<Button>` component API that wraps or replaces the CSS classes.

### 5. Tailwind v4 — no config file, theme via CSS

The project uses `@tailwindcss/postcss` with Tailwind v4's `@import "tailwindcss"` and `@theme inline` block (lines 108-120 of globals.css). There is no `tailwind.config.*`. All new tokens go into `:root` and optionally into `@theme inline` for Tailwind utility generation. New color tokens that should be usable as Tailwind classes (e.g., `bg-[var(--surface-0)]`) need an entry in the `@theme inline` block.

### 6. Light mode needs Token Spec v1 awareness

`:root.light` (lines 80-106) overrides all color tokens. Any new tokens added to `:root` that are color-dependent (unlikely for spacing/type, but relevant for any new surface or accent tokens) need corresponding light-mode overrides.

### 7. Breakpoints are already in CSS and match the plan

All five documented breakpoints (1280, 1100, 900, 600, 500px) are present in `globals.css`. No additions needed — just formalize them as named tokens if desired.

### 8. Brand vector-to-particle mapping (from TF Figma file)

The [TF brand file](https://www.figma.com/design/h46nSII3A8lC7Y2eYGU7X9/TF?node-id=0-1) confirms:

- **VECTORS vs GLITCHED** pairs on the `Graphics_Icons` frames — every clean star vector has a glitched sibling. This is the brand precedent for the particle system's skeleton+drift model.
- **Gateway** (ring) and **North Star** (axis cross) are the two geometric seeds from which particle glyphs should be derived.
- **Brandmark Usage** specifies `0.3x` minimum clear space around the mark — carry into `SigilParticleLogo` component constraints.
- The glitch is not decorative noise. It is the **drift layer**: small, offset, lower-alpha, deterministic. The `particle-icon-grammar.md` reference already encodes this as the three-layer model (Skeleton + Signal + Drift).

---

## Phase 4: Figma Design System Generation (Sigil Figma Plugin)

A standalone **Sigil Figma Plugin** — separate from Heimdall — that programmatically creates the entire design system on the **"-> Design System" page** (`1:1586`) in the [TF brand file](https://www.figma.com/design/h46nSII3A8lC7Y2eYGU7X9/TF). The plugin lives inside the Sigil repo at `packages/figma-plugin/`.

### Plugin architecture (modeled on Heimdall patterns, independent codebase)

- **Build**: esbuild, TypeScript bundled to IIFE (`code.js`)
- **UI**: Minimal inline HTML panel with command buttons
- **Manifest**: Figma Plugin API 1.0.0, `documentAccess: "dynamic-page"` (needed to target specific pages)
- **No backend required** — all token data is compiled into the plugin bundle

### Figma Plugin APIs used

Node creation:

- `figma.createFrame()`, `figma.createText()`, `figma.createRectangle()` — specimen frames, labels, swatches
- `figma.loadFontAsync()` — load PT Mono, IBM Plex Sans, PP Mondwest before text operations
- Auto-layout: `layoutMode`, `primaryAxisSizingMode`, `counterAxisSizingMode`, `itemSpacing`, `paddingLeft/Right/Top/Bottom`

Style creation:

- `figma.createPaintStyle()` — Color Styles from token palette (Dawn, Gold, Atreides, etc.)
- `figma.createTextStyle()` — Text Styles from type scale (`--type-0` through `--type-8`)

Component creation:

- `figma.createComponent()` — individual component masters (Diamond, ParticleIcon, Button)
- `figma.createComponentSet()` — variant sets (Button/Primary/sm, Button/Primary/md, etc.)

### Target page structure (modeled after Sci-fi UI Kit)

The plugin generates 6 specimen frames on the "-> Design System" page:

**Frame 1: Typography**

- Each type scale step (`--type-0` through `--type-8`) rendered as live specimen text at actual size
- Metadata row beside each: typeface, weight, size, case, line-height, letter-spacing
- Font families: PT Mono, IBM Plex Sans, PP Mondwest
- Summary table at bottom with all steps
- Particle system glyph specimens (all variants at 12/18/32px)

**Frame 2: Spacing**

- Each spacing token (`--space-0` through `--space-14`) as a proportional visual bar
- Token name, rem value, pixel value columns
- Grouped: base scale, layout gaps, container padding, inline spacing, vertical rhythm

**Frame 3: Colors**

- Palette swatches for all color tiers: Dawn/Ink, Gold, Atreides, Nebulae, Spice
- Both dark-mode and light-mode variants side by side
- Signal Strength opacity ladder (dawn-04 through dawn-70)
- Gold opacity ladder (gold-10 through gold-30)
- Status colors (success, error/alert)

**Frame 4: Buttons**

- Full variant matrix: `primary | secondary | stroke | transparent` across columns
- `sm | md | lg` sizes down rows
- States: default, hover, active, disabled
- Icon-only variants
- Two blocks: onDark (void bg) and onLight (dawn bg)

**Frame 5: Components**

- Diamond (variants: sm/md/lg, gold/inactive/neutral/alert)
- ParticleIcon (variants: arrow, logo, settings, theme, open at 12/18/32px)
- SectionLabel (with/without bearing)
- CardFrame (default/hover, with/without chamfer)
- CategoryRow (learn/create)
- BackLink specimen

**Frame 6: Particle Icon Grammar**

- All glyph variants showing three-layer decomposition: skeleton, signal, drift
- Size specimens (12, 18, 32px)
- Brand vectors vs glitched pairs (from `Graphics_Icons` frame in brand file)

### Plugin file structure

```
packages/figma-plugin/
  manifest.json
  code.ts                          <- entry point, command router
  tsconfig.json
  esbuild.config.mjs
  ui.html                          <- minimal panel UI
  src/
    tokens/thoughtformTokens.ts    <- all token values compiled in
    generators/
      typography.ts
      spacing.ts
      colors.ts
      buttons.ts
      components.ts
      particleGrammar.ts
    helpers/
      createAutoLayoutFrame.ts     <- shared frame creation utils
      createLabel.ts               <- shared text node factory
      colorUtils.ts                <- hex-to-RGB, opacity helpers
    generateDesignSystem.ts        <- orchestrator: finds page, runs all generators
```

### Auth / integration requirements

- No auth needed — plugin runs in Figma sandbox, all data is compiled in
- PT Mono and IBM Plex Sans must be available in the Figma file (load via `figma.loadFontAsync`)
- PP Mondwest (display font) may need team font install or fallback to PT Mono for specimens

---

## Implementation order

The work splits cleanly into documentation (no code changes), token work (CSS), component extraction (React), and Figma generation (plugin):

1. **Documentation update** — Update the skill reference files to match reality
2. **Token Spec v1** — Add spacing numeric scale + re-alias semantics, type scale, tracking, line-height in `globals.css`
3. **Duration token correction** — Fix `--duration-fast/base/slow` to brand spec (80/120/150ms), audit consumers
4. **Layout tokens** — Add the formalized layout tokens to `globals.css`
5. **Component extraction** — Extract the 6 high/medium priority components (on v1 tokens from day one)
6. **Refactor consumers** — Update JourneyCard, JourneyPanel, RouteCard, etc. to use extracted components
7. **Sigil plugin: scaffold** — Create `packages/figma-plugin/` with manifest, esbuild, entry point, UI panel
8. **Sigil plugin: token data module** — Create `thoughtformTokens.ts` with all token values compiled in
9. **Sigil plugin: specimen generators** — Implement the 6 frame generators (typography, spacing, colors, buttons, components, particle grammar)
10. **Sigil plugin: Figma Styles** — Create Paint Styles and Text Styles from token data
11. **Sigil plugin: Figma Components** — Create Component Sets for Diamond, ParticleIcon, Button, etc.

---

## Files to touch

### Sigil codebase (`05_sigil.thoughtform`)

- `C:\Users\buyss\.cursor\skills\thoughtform-design\references\components.md` — add 6 new component entries, update existing entries to match actual implementation
- `C:\Users\buyss\.cursor\skills\thoughtform-design\SKILL.md` — add ParticleIcon as 11th grammar primitive
- `app/globals.css` — add Token Spec v1 (spacing/type/tracking/line-height) and layout tokens
- `components/ui/Diamond.tsx` — new component
- `components/ui/ParticleIcon.tsx` — new component
- `components/ui/SectionLabel.tsx` — new component
- `components/ui/CardFrame.tsx` — new component
- `components/ui/CategoryRow.tsx` — new component
- `components/ui/BackLink.tsx` — new component

### Sigil Figma Plugin (`packages/figma-plugin/` in Sigil repo)

- `manifest.json` — Figma Plugin API 1.0.0 config
- `code.ts` — entry point, command router
- `ui.html` — minimal panel UI with command buttons
- `esbuild.config.mjs` — build config (TS to IIFE)
- `src/tokens/thoughtformTokens.ts` — all token values compiled in
- `src/generateDesignSystem.ts` — orchestrator (finds page, runs generators)
- `src/generators/typography.ts` — type specimens
- `src/generators/spacing.ts` — spacing bars
- `src/generators/colors.ts` — palette swatches + Paint Styles
- `src/generators/buttons.ts` — button variant matrix
- `src/generators/components.ts` — component specimens + Component Sets
- `src/generators/particleGrammar.ts` — particle icon grammar + drift decomposition
- `src/helpers/createAutoLayoutFrame.ts` — shared frame creation utils
- `src/helpers/createLabel.ts` — shared text node factory
- `src/helpers/colorUtils.ts` — hex-to-RGB, opacity helpers

