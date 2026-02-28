import { COLORS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";

type Pixel = { x: number; y: number; alpha: number };

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

function arrowPixels(): Pixel[] {
  return [
    { x: 1, y: 5, alpha: 0.45 },
    { x: 3, y: 5, alpha: 0.6 },
    { x: 5, y: 5, alpha: 0.8 },
    { x: 7, y: 3, alpha: 1 },
    { x: 7, y: 5, alpha: 1 },
    { x: 7, y: 7, alpha: 1 },
    { x: 9, y: 5, alpha: 1 },
  ];
}

function logoPixels(): Pixel[] {
  const grid = 3;
  const c = 16;
  const r = 10;
  const pts: Pixel[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r, grid), y: snap(c + Math.sin(a) * r, grid), alpha: 0.95 });
  }
  for (let d = -6; d <= 6; d += grid) {
    if (d !== 0) {
      pts.push({ x: snap(c + d, grid), y: snap(c, grid), alpha: 0.85 });
      pts.push({ x: snap(c, grid), y: snap(c + d, grid), alpha: 0.85 });
    }
  }
  pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 1 });
  const r2 = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r2, grid), y: snap(c + Math.sin(a) * r2, grid), alpha: 0.7 });
  }
  return pts;
}

function settingsPixels(): Pixel[] {
  const grid = 3;
  const c = 9;
  const r = 5;
  const pts: Pixel[] = [];
  for (let d = -r; d <= r; d += grid) {
    if (d !== 0) {
      pts.push({ x: snap(c + d, grid), y: snap(c, grid), alpha: 0.85 });
      pts.push({ x: snap(c, grid), y: snap(c + d, grid), alpha: 0.85 });
    }
  }
  pts.push({ x: snap(c - r, grid), y: snap(c - r, grid), alpha: 0.7 });
  pts.push({ x: snap(c + r, grid), y: snap(c - r, grid), alpha: 0.7 });
  pts.push({ x: snap(c - r, grid), y: snap(c + r, grid), alpha: 0.7 });
  pts.push({ x: snap(c + r, grid), y: snap(c + r, grid), alpha: 0.7 });
  pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 1 });
  return pts;
}

const GLYPH_DEFS: Array<{ name: string; pixels: Pixel[]; size: number; grid: number }> = [
  { name: "arrow", pixels: arrowPixels(), size: 12, grid: 2 },
  { name: "logo", pixels: logoPixels(), size: 32, grid: 3 },
  { name: "settings", pixels: settingsPixels(), size: 18, grid: 3 },
];

function createPixelGlyphFrame(def: typeof GLYPH_DEFS[0], scale: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = `${def.name}-${scale}x`;
  frame.resize(def.size * scale, def.size * scale);
  frame.fills = [{ type: "SOLID", color: COLORS.void }];

  for (const px of def.pixels) {
    const rect = figma.createRectangle();
    const w = (def.grid - 1) * scale;
    rect.resize(w, w);
    rect.x = px.x * scale;
    rect.y = px.y * scale;
    rect.fills = [{ type: "SOLID", color: COLORS.gold, opacity: px.alpha }];
    frame.appendChild(rect);
  }

  return frame;
}

export async function createParticleGrammarFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Particle Icon Grammar",
    direction: "VERTICAL",
    spacing: 48,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Particle Icon Grammar", fontSize: 34, font: { family: "IBM Plex Sans", style: "Bold" }, color: COLORS.dawn });
  container.appendChild(title);

  const subtitle = await createLabel({
    text: "Three layers: Skeleton (intent) + Signal (emphasis) + Drift (machine trace)",
    fontSize: 14,
    font: { family: "IBM Plex Sans", style: "Regular" },
    color: COLORS.dawn,
    uppercase: false,
  });
  subtitle.opacity = 0.5;
  container.appendChild(subtitle);

  for (const def of GLYPH_DEFS) {
    const section = createAutoLayoutFrame({ name: def.name, direction: "VERTICAL", spacing: 16 });

    const glyphLabel = await createLabel({ text: def.name, fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
    section.appendChild(glyphLabel);

    const scaleRow = createAutoLayoutFrame({ name: "scales", direction: "HORIZONTAL", spacing: 32 });
    scaleRow.counterAxisAlignItems = "CENTER";

    for (const scale of [1, 2, 4]) {
      const glyph = createPixelGlyphFrame(def, scale);
      scaleRow.appendChild(glyph);

      const sizeNote = await createLabel({
        text: `${def.size * scale}px (${scale}x)`,
        fontSize: 9,
        color: COLORS.dawn,
        uppercase: false,
      });
      sizeNote.opacity = 0.3;
      scaleRow.appendChild(sizeNote);
    }

    section.appendChild(scaleRow);

    const meta = await createLabel({
      text: `Grid: ${def.grid}px · Native: ${def.size}px · ${def.pixels.length} pixels`,
      fontSize: 10,
      color: COLORS.dawn,
      uppercase: false,
    });
    meta.opacity = 0.3;
    section.appendChild(meta);

    container.appendChild(section);
  }

  return container;
}
