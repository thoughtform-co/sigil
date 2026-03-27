---
name: HTML to PowerPoint Conversion
overview: Write a Python script using python-pptx to programmatically convert the 8-page HTML infographic into a pixel-accurate .pptx file, mapping every CSS layout, color, font, badge, card, arrow, and image to native PowerPoint shapes and text boxes.
todos:
  - id: script-scaffold
    content: Create build_pptx.py with slide dimensions, color constants, font helpers, and unit conversion utilities
    status: completed
  - id: slide-1-cover
    content: "Build Slide 1 (Cover): title, quote, stats, tool table, badges, meta bars"
    status: completed
  - id: slide-2-proteus
    content: "Build Slide 2 (Project Proteus): Heimdall frame, 4 layer cards, flow arrows, thesis bar, connectors"
    status: completed
  - id: slide-3-showcase
    content: "Build Slide 3 (Creative Showcase): 2 embedded images with caption overlays"
    status: completed
  - id: slide-4-tools
    content: "Build Slide 4 (The Tools): prod zone cards, merge connector, WIP cards, Heimdall strip"
    status: completed
  - id: slide-5-fluency
    content: "Build Slide 5 (AI Fluency): Claude mark, use-case tags, adoption table, scaffold blocks, callout"
    status: completed
  - id: slide-6-impact
    content: "Build Slide 6 (Impact and Horizon): outcome items, metrics table, horizon list, tech stack strip"
    status: completed
  - id: slide-7-divider
    content: "Build Slide 7 (Part II Divider): title, intro paragraphs, separator"
    status: completed
  - id: slide-8-part2
    content: "Build Slide 8 (Part II Tools): 4 product cards with Done/Next sections, POCs row"
    status: completed
  - id: run-verify
    content: Run the script, verify output opens correctly and spot-check fidelity against the HTML
    status: completed
isProject: false
---

# HTML to Pixel-Perfect PowerPoint Conversion

## Source and target

- **Input**: `[loop-ai-infographic-v5.html](c:\Users\buyss\OneDrive - Loop\Creative Technology\04_Projects\_AI Project Status\loop-ai-infographic-v5.html)` -- 8 landscape pages (297mm x 210mm), CSS grid layouts, custom fonts, color badges, flow arrows, images
- **Output**: `loop-ai-infographic-v5.pptx` in the same directory
- **Tool**: Single Python script using `python-pptx` (already installed at v1.0.2)

## Approach

Write one self-contained Python script (`build_pptx.py`) in the `_AI Project Status` folder that:

1. Sets slide dimensions to **297mm x 210mm** (A4 landscape), matching the HTML `.page` size
2. Builds each of the **8 slides** below with absolute-positioned shapes, mapping CSS measurements to EMU units
3. Saves to `loop-ai-infographic-v5.pptx`

## Slide breakdown

### Slide 1 -- Cover

- Left half: title "AI Across / Marketing" (Avantt 700, 3rem), quote block with purple left border shape, context paragraph
- Right half: "85-90%" stat (Avantt 700, 4.2rem purple), tool table (7 rows: Vesper, Inku, Heimdall, separator, Mimir, Babylon, separator, Claude) with status badges
- Top meta bar + bottom footer bar (thin horizontal lines)

### Slide 2 -- Project Proteus

- Header with "Architecture" mono label + h2
- Heimdall frame: green-labeled rectangle border around the flow area
- 4-column card grid: Intelligence / Generation / Curation / Localization, each with role label, h3, description, bullet list, primary tool footer
- 3 flow arrows between cards (solid purple for first two, dashed gray for third)
- Purple thesis bar at bottom
- Connector row (6 items with green line prefixes)

### Slide 3 -- Creative Showcase

- Header + description
- 2-column image grid embedding:
  - `03_references/EXP-LM200.AttentionGrabberPartTwo-Dream-Sleep-B-4x5.png`
  - `03_references/SB153.SwitchLooks-Switch-Fashion-B-4x5.jpg`
- Gradient overlay captions with title + tool label on each image

### Slide 4 -- The Tools

- Heimdall frame wrapping everything
- Production zone: Vesper card (left, purple left border) + merge connector + Inku card (right, purple-mid left border)
- WIP zone: Mimir + Babylon cards (dashed borders, amber left border)
- Heimdall strip at bottom (green border, capabilities pills)

### Slide 5 -- AI Fluency (Claude)

- Claude SVG mark recreated as 4 crossed lines shape group
- Left column: use-case tags grid, team adoption rows with diamond dots
- Right column: Skills block (with SKILL.md badge + capability pills), Integrations block, Cowork block
- Bottom orange callout bar

### Slide 6 -- Impact and Horizon

- Left column: 4 "Live Impact" outcome items + 3 "Expected Impact" WIP items, each with badges
- Right top: Metrics table (4 rows)
- Right middle: Next 90 Days numbered list (5 items)
- Bottom: 5-column tech stack strip

### Slide 7 -- Part II Divider

- Centered-left layout: "Part II" mono label, large title "ML / AI Engineering & Shared Intelligence", blue separator bar, two paragraphs

### Slide 8 -- Part II Tools

- 2x2 grid of cards: Ada, Insights Hub, Topic and Sentiment Tagging, Figma Translation Plugin -- each with Done/Next sections
- Full-width POCs row at bottom with 2 exploration items

## Design system mapping

- **Fonts**: Avantt (headings) / DM Sans (body) / IBM Plex Mono (labels/badges) -- these will be set by name; PowerPoint will resolve or substitute on the user's machine
- **Colors** (HSL to RGB):
  - `--bg` hsl(35,20%,97%) -> #F8F6F3
  - `--fg` hsl(0,0%,10%) -> #1A1A1A
  - `--purple` hsl(263,66%,44%) -> #5B26B5
  - `--purple-light` hsl(263,40%,92%) -> #E5DCF3
  - `--status-prod` hsl(152,50%,36%) -> #2E8B57 (approx)
  - `--status-wip` hsl(36,80%,50%) -> #E6A217 (approx)
  - `--claude` hsl(17,65%,58%) -> #D4784A (approx)
  - `--ai-eng` hsl(210,55%,42%) -> #305F99 (approx)
  - `--border` hsl(35,10%,88%) -> #E3E0DC
  - `--muted-fg` hsl(0,0%,45%) -> #737373
- **Page padding**: 20mm top/bottom, 26mm left/right (matching CSS `--page-pad-y` / `--page-pad-x`)
- **Unit conversion**: 1mm = 36000 EMU (python-pptx uses `Mm()` helper)

## Image handling

- Both showcase images exist in `03_references/` and will be embedded via `slide.shapes.add_picture()`
- Caption overlays will be semi-transparent dark shapes with white text positioned at the bottom of each image

## Complexity notes

- Flow arrows built from line shapes + triangle end shapes
- Badges built as small text boxes with colored fills and no border
- Card borders use shape outline properties (solid/dashed, colored left-border simulated by a thin rectangle overlay)
- The CSS noise texture background will be omitted (not reproducible in PPTX) -- slides will use the flat warm off-white `#F8F6F3`

