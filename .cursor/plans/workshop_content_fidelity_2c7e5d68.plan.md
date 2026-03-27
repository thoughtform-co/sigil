---
name: Workshop Content Fidelity
overview: Make the workshop page a faithful port of the Poppins HTML prototype by implementing full-bleed backgrounds that span behind the rails, porting all section content (cards, exercises, sliders, reveals, concept stacks, flow diagrams, team grids), and resolving the left/right sidebar redundancy.
todos:
  - id: full-bleed-slides
    content: Refactor WorkshopSlide so background tints span full viewport width while content stays inset.
    status: completed
  - id: port-section-content
    content: Port all rich section content from the Poppins HTML into typed React section components.
    status: completed
  - id: resolve-sidebar-redundancy
    content: Replace the left spine with a minimal current-chapter readout and add bearing numbers to the right sidebar.
    status: completed
  - id: verify-visual-fidelity
    content: Check that all sections, interactions, and layout match the original HTML prototype.
    status: completed
isProject: false
---

# Workshop Content Fidelity

## Three Problems

### 1. Backgrounds are cropped, not full-bleed

The workshop content area is inset by `marginLeft` and `marginRight` in [components/workshops/BrandedWorkshopPage.tsx](components/workshops/BrandedWorkshopPage.tsx), so section tints stop at the content margins instead of spanning the full viewport behind the rails. The fix is to split the layout into two layers: a full-width background layer that each slide paints edge-to-edge, and a content layer that is inset between the spine and sidebar. The `WorkshopSlide` wrapper should handle this itself -- full-viewport-width outer div for background, inner constrained div for content.

### 2. Section content is missing

The current implementation renders only a chapter tag and a section title per slide. The original HTML has rich, distinct content for every section:


| Section         | Content in HTML (missing now)                                                  |
| --------------- | ------------------------------------------------------------------------------ |
| loop            | Isometric SVG map of Navigate/Encode/Accelerate                                |
| nav-principles  | 4 principle cards + Rewrite Challenge exercise                                 |
| nav-dimensional | Cringe/Formality sliders with live text output + system prompt card + exercise |
| nav-semantic    | Prompt reveal (normal vs semantic) + wolf constellation SVG + exercise         |
| enc-context     | 5 context-type SVG icons + "median vs your output" line + exercise             |
| enc-system      | 3-layer concept stack + exercise                                               |
| enc-projects    | 2 cards + link prompt block + exercise                                         |
| enc-skills      | 3 cards + never-say highlight card + 6 role skill-idea cards + exercise        |
| enc-memory      | 3 cards + exercise                                                             |
| acc-cowork      | 3 cowork feature cards + exercise                                              |
| acc-build       | 2 cards + flywheel highlight card + exercise                                   |
| acc-team        | 6 team profile cards (2-col grid) + exercise                                   |
| synthesis       | 4-step flow row + meta-example card + exercise                                 |
| closing         | 3 closing question cards (dark)                                                |


All of this content needs to be hardcoded into section-specific components or rendered from the section data, since it is fixed workshop content, not dynamic data from settings. The settings only control branding, team profiles, and resources -- the actual workshop pedagogy (principles, exercises, concept stacks, sliders) is part of the template.

### 3. Left and right sidebars are redundant

Both show chapter-level navigation. The solution matching the original HTML's pattern:

- **Right sidebar** stays as the full table of contents (chapters + all section titles with bearing numbers) -- this is the primary navigation instrument, matching the original `#sidebar`
- **Left spine** becomes a minimal current-chapter indicator -- just the active chapter name and its accent tint, functioning as a "you are here" readout rather than a second navigation menu. This keeps the rail-adjacent spine pattern from the Thoughtform grammar while eliminating duplication.

## Implementation

### File changes

**[components/workshops/BrandedWorkshopPage.tsx](components/workshops/BrandedWorkshopPage.tsx)** -- Major rewrite:

- Remove `marginLeft`/`marginRight` from the content wrapper. Each `WorkshopSlide` should be a full-width div (so tints and backgrounds span edge to edge behind the rails), with an inner content container that is margin-inset.
- Replace the left chapter spine with a minimal active-chapter readout (chapter title + tint swatch, no clickable list).
- Add bearing numbers to the right sidebar items to match the original HTML (01, 02, 03...).
- Port all section content from the HTML into a section-specific renderer. Since this is a Poppins-specific template, the content can be hardcoded in a `SectionContent` component keyed by `section.id`.

**[components/workshops/sections/](components/workshops/sections/)** -- New section components:

- `PrincipleCards` -- 4-card grid
- `DimensionalSlider` -- interactive cringe/formality slider with live text output
- `SemanticReveal` -- prompt reveal toggle with wolf constellation SVG
- `ConceptStack` -- numbered layer stack (used by system prompts)
- `ExerciseBlock` -- dashed-border exercise card with role tag
- `ContentCards` -- reusable 2/3/4-column card grid
- `FlowRow` -- brainstorm/validate/execute/iterate flow diagram
- `ContextIcons` -- 5 SVG context-type icons
- `LoopMap` -- isometric SVG of the Navigate/Encode/Accelerate loop

Each section component receives the branding CSS variables and the client name for any Poppins-specific copy.

### Design alignment (from Thoughtform design skill)

- Cards use `border: 1px solid` with the `--ws-dark` at 8% opacity, no border-radius (matching Thoughtform zero-radius rule), hover lift via `translateY(-3px)`
- Exercise blocks use `2px dashed` borders with a `EXERCISE` tag label positioned absolutely above
- Active states on the right sidebar use border-right (heading indicator grammar) with the accent color
- Bearing labels in mono 9px with 0.1em tracking (bearing label grammar)
- The left readout uses the data readout pattern: mono, uppercase, tiny, showing the current chapter as an instrument reading rather than a nav menu

### Full-bleed approach

```
+------------------------------------------------------------------+
|  [rail]  [spine]  |  full-width tinted background  |  [sidebar] [rail]  |
|                   |  +-inner content (max 900px)-+  |                    |
+------------------------------------------------------------------+
```

The outer `WorkshopSlide` div spans `width: 100vw` (or the full parent). The tint covers everything. The inner content div centers itself with `max-width: 900px` and appropriate left/right padding to clear the fixed spine and sidebar.

## Verification

- Section tints span the full viewport width, going behind/under the rails
- Every section renders its full content matching the HTML prototype
- The left side shows only the current chapter indicator, not a duplicate TOC
- The right sidebar has bearing numbers and functions as the primary navigation
- Interactive elements (dimensional slider, semantic reveal) work correctly
- Exercise blocks render with the dashed-border pattern from the original

