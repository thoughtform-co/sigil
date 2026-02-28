import { COLORS, DAWN_OPACITIES, GOLD_OPACITIES } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";
import { solidPaint } from "../helpers/colorUtils";

type SwatchDef = { name: string; color: RGB; role: string };

const PRIMARY_SWATCHES: SwatchDef[] = [
  { name: "Semantic Dawn", color: COLORS.dawn, role: "Light Anchor" },
  { name: "Latent Night", color: COLORS.void, role: "The Void" },
  { name: "Tensor Gold", color: COLORS.gold, role: "Primary Accent" },
  { name: "Atreides", color: COLORS.atreides, role: "House Green" },
  { name: "Nebulae", color: COLORS.nebulae, role: "Deep Space" },
  { name: "Spice", color: COLORS.spice, role: "Warm Accent" },
  { name: "Atreides Light", color: COLORS.atreidesLight, role: "Secondary Green" },
];

const SURFACE_SWATCHES: SwatchDef[] = [
  { name: "void", color: COLORS.void, role: "Background" },
  { name: "surface-0", color: COLORS.surface0, role: "Elevated" },
  { name: "surface-1", color: COLORS.surface1, role: "Nested" },
  { name: "surface-2", color: COLORS.surface2, role: "Closest" },
];

async function createSwatchRow(swatch: SwatchDef, size: number): Promise<FrameNode> {
  const row = createAutoLayoutFrame({ name: swatch.name, direction: "HORIZONTAL", spacing: 16 });
  row.counterAxisAlignItems = "CENTER";

  const rect = figma.createRectangle();
  rect.name = "swatch";
  rect.resize(size, size);
  rect.fills = [solidPaint(swatch.color.r, swatch.color.g, swatch.color.b)];
  rect.strokes = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  rect.strokeWeight = 1;
  row.appendChild(rect);

  const info = createAutoLayoutFrame({ name: "info", direction: "VERTICAL", spacing: 2 });
  const nameLabel = await createLabel({ text: swatch.name, fontSize: 12, color: COLORS.dawn });
  info.appendChild(nameLabel);

  const toHex = (c: RGB) => "#" + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  const hexLabel = await createLabel({ text: toHex(swatch.color), fontSize: 10, color: COLORS.dawn, uppercase: false });
  hexLabel.opacity = 0.5;
  info.appendChild(hexLabel);

  const roleLabel = await createLabel({ text: swatch.role, fontSize: 10, color: COLORS.dawn, uppercase: false });
  roleLabel.opacity = 0.3;
  info.appendChild(roleLabel);

  row.appendChild(info);
  return row;
}

export async function createColorFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Colors",
    direction: "VERTICAL",
    spacing: 48,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Colors", fontSize: 34, font: { family: "IBM Plex Sans", style: "Bold" }, color: COLORS.dawn });
  container.appendChild(title);

  const primaryLabel = await createLabel({ text: "Primary Palette", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  container.appendChild(primaryLabel);

  const primaryGrid = createAutoLayoutFrame({ name: "primary-grid", direction: "HORIZONTAL", spacing: 24 });
  primaryGrid.layoutWrap = "WRAP";
  for (const s of PRIMARY_SWATCHES) {
    const row = await createSwatchRow(s, 80);
    primaryGrid.appendChild(row);
  }
  container.appendChild(primaryGrid);

  const surfaceLabel = await createLabel({ text: "Depth Layers", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  container.appendChild(surfaceLabel);

  const surfaceRow = createAutoLayoutFrame({ name: "surface-row", direction: "HORIZONTAL", spacing: 0 });
  for (const s of SURFACE_SWATCHES) {
    const swatch = await createSwatchRow(s, 120);
    surfaceRow.appendChild(swatch);
  }
  container.appendChild(surfaceRow);

  const dawnLabel = await createLabel({ text: "Signal Strength (Dawn Opacity)", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  container.appendChild(dawnLabel);

  const dawnRow = createAutoLayoutFrame({ name: "dawn-opacity", direction: "HORIZONTAL", spacing: 8 });
  for (const step of DAWN_OPACITIES) {
    const rect = figma.createRectangle();
    rect.name = step.name;
    rect.resize(60, 40);
    rect.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, step.opacity)];
    dawnRow.appendChild(rect);
  }
  container.appendChild(dawnRow);

  const goldLabel = await createLabel({ text: "Gold Opacity Ladder", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  container.appendChild(goldLabel);

  const goldRow = createAutoLayoutFrame({ name: "gold-opacity", direction: "HORIZONTAL", spacing: 8 });
  for (const step of GOLD_OPACITIES) {
    const rect = figma.createRectangle();
    rect.name = step.name;
    rect.resize(60, 40);
    rect.fills = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b, step.opacity)];
    goldRow.appendChild(rect);
  }
  container.appendChild(goldRow);

  return container;
}

export async function createColorStyles(): Promise<void> {
  for (const s of PRIMARY_SWATCHES) {
    const style = figma.createPaintStyle();
    style.name = `Thoughtform/${s.name}`;
    style.paints = [solidPaint(s.color.r, s.color.g, s.color.b)];
  }

  for (const s of SURFACE_SWATCHES) {
    const style = figma.createPaintStyle();
    style.name = `Thoughtform/Surfaces/${s.name}`;
    style.paints = [solidPaint(s.color.r, s.color.g, s.color.b)];
  }

  for (const step of DAWN_OPACITIES) {
    const style = figma.createPaintStyle();
    style.name = `Thoughtform/Dawn/${step.name}`;
    style.paints = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, step.opacity)];
  }

  for (const step of GOLD_OPACITIES) {
    const style = figma.createPaintStyle();
    style.name = `Thoughtform/Gold/${step.name}`;
    style.paints = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b, step.opacity)];
  }
}
