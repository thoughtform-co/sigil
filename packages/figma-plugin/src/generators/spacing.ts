import { SPACING_SCALE, COLORS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";

export async function createSpacingFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Spacing",
    direction: "VERTICAL",
    spacing: 32,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Spacing", fontSize: 34, font: { family: "IBM Plex Sans", style: "Bold" }, color: COLORS.dawn });
  container.appendChild(title);

  const subtitle = await createLabel({
    text: "4px quantum · 8px structural cadence · 14 steps",
    fontSize: 14,
    font: { family: "IBM Plex Sans", style: "Regular" },
    color: COLORS.dawn,
    uppercase: false,
  });
  subtitle.opacity = 0.5;
  container.appendChild(subtitle);

  for (const step of SPACING_SCALE) {
    if (step.px === 0) continue;

    const row = createAutoLayoutFrame({ name: step.label, direction: "HORIZONTAL", spacing: 24 });
    row.counterAxisAlignItems = "CENTER";

    const labelNode = await createLabel({
      text: step.label,
      fontSize: 11,
      color: COLORS.dawn,
      letterSpacing: 0.88,
    });
    labelNode.resize(120, labelNode.height);
    labelNode.textAutoResize = "NONE";
    row.appendChild(labelNode);

    const bar = figma.createRectangle();
    bar.name = "bar";
    const barWidth = Math.min(step.px * 4, 640);
    bar.resize(barWidth, 8);
    bar.fills = [{ type: "SOLID", color: COLORS.gold, opacity: 0.6 }];
    bar.cornerRadius = 0;
    row.appendChild(bar);

    const pxLabel = await createLabel({
      text: `${step.px}px`,
      fontSize: 10,
      color: COLORS.dawn,
      uppercase: false,
    });
    pxLabel.opacity = 0.4;
    row.appendChild(pxLabel);

    const remLabel = await createLabel({
      text: `${(step.px / 16).toFixed(step.px % 16 === 0 ? 0 : 2)}rem`,
      fontSize: 10,
      color: COLORS.dawn,
      uppercase: false,
    });
    remLabel.opacity = 0.3;
    row.appendChild(remLabel);

    container.appendChild(row);
  }

  return container;
}
