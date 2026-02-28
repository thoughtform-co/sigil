import { COLORS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";
import { solidPaint } from "../helpers/colorUtils";

async function createDiamondSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "Diamond", direction: "VERTICAL", spacing: 16 });

  const label = await createLabel({ text: "Diamond", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(label);

  const sizes = [6, 8, 12];
  const colors: Array<{ name: string; color: RGB }> = [
    { name: "gold", color: COLORS.gold },
    { name: "inactive", color: { r: COLORS.dawn.r, g: COLORS.dawn.g, b: COLORS.dawn.b } },
    { name: "alert", color: COLORS.statusError },
  ];

  for (const c of colors) {
    const row = createAutoLayoutFrame({ name: c.name, direction: "HORIZONTAL", spacing: 16 });
    row.counterAxisAlignItems = "CENTER";

    const nameLabel = await createLabel({ text: c.name, fontSize: 9, color: COLORS.dawn });
    nameLabel.opacity = 0.4;
    nameLabel.resize(64, nameLabel.height);
    nameLabel.textAutoResize = "NONE";
    row.appendChild(nameLabel);

    for (const sz of sizes) {
      const rect = figma.createRectangle();
      rect.name = `diamond-${sz}`;
      rect.resize(sz, sz);
      rect.rotation = 45;
      rect.fills = [solidPaint(c.color.r, c.color.g, c.color.b)];
      row.appendChild(rect);
    }

    group.appendChild(row);
  }

  return group;
}

async function createCardFrameSpecimen(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "CardFrame", direction: "VERTICAL", spacing: 16 });

  const label = await createLabel({ text: "CardFrame", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(label);

  const card = createAutoLayoutFrame({
    name: "card-specimen",
    direction: "VERTICAL",
    spacing: 12,
    padding: { top: 12, right: 20, bottom: 20, left: 20 },
    fill: COLORS.surface0,
    width: 300,
  });
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.strokes = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  card.strokeWeight = 1;

  const catLabel = await createLabel({ text: "learn", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
  catLabel.opacity = 0.4;
  card.appendChild(catLabel);

  const divider = figma.createRectangle();
  divider.name = "divider";
  divider.resize(260, 1);
  divider.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  card.appendChild(divider);

  const titleLabel = await createLabel({ text: "Journey Title", fontSize: 13, color: COLORS.dawn, letterSpacing: 1.04 });
  card.appendChild(titleLabel);

  const desc = await createLabel({ text: "Description text goes here", fontSize: 12, font: { family: "IBM Plex Sans", style: "Regular" }, color: COLORS.dawn, uppercase: false });
  desc.opacity = 0.5;
  card.appendChild(desc);

  const stats = await createLabel({ text: "3 routes  ·  12 generations", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.45 });
  stats.opacity = 0.7;
  card.appendChild(stats);

  group.appendChild(card);
  return group;
}

export async function createComponentFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Components",
    direction: "VERTICAL",
    spacing: 64,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Components", fontSize: 34, font: { family: "IBM Plex Sans", style: "Bold" }, color: COLORS.dawn });
  container.appendChild(title);

  const diamonds = await createDiamondSpecimens();
  container.appendChild(diamonds);

  const cardFrame = await createCardFrameSpecimen();
  container.appendChild(cardFrame);

  return container;
}
