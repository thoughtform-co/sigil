import { COLORS, FONTS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";
import { solidPaint } from "../helpers/colorUtils";

type BtnVariant = "primary" | "secondary" | "stroke" | "transparent";
type BtnSize = "sm" | "md" | "lg";
type BtnState = "default" | "hover" | "active" | "disabled";

const SIZE_PADDING: Record<BtnSize, { v: number; h: number; fontSize: number }> = {
  sm: { v: 6, h: 14, fontSize: 9 },
  md: { v: 10, h: 20, fontSize: 11 },
  lg: { v: 14, h: 28, fontSize: 13 },
};

function btnColors(variant: BtnVariant, state: BtnState) {
  const gold = COLORS.gold;
  const dawn = COLORS.dawn;
  const void_ = COLORS.void;
  const dawn08 = { ...dawn };

  if (variant === "primary") {
    if (state === "default") return { bg: gold, border: gold, text: void_ };
    if (state === "hover") return { bg: dawn, border: dawn, text: void_ };
    if (state === "active") return { bg: dawn, border: dawn, text: void_ };
    return { bg: gold, border: gold, text: void_ };
  }
  if (variant === "secondary") {
    if (state === "default") return { bg: null, border: gold, text: dawn, bgOpacity: 0.2, borderOpacity: 0.3 };
    if (state === "hover") return { bg: null, border: gold, text: dawn, bgOpacity: 0.3, borderOpacity: 1 };
    return { bg: null, border: gold, text: dawn, bgOpacity: 0.2, borderOpacity: 0.3 };
  }
  if (variant === "stroke") {
    if (state === "default") return { bg: null, border: dawn, text: dawn, borderOpacity: 0.08 };
    if (state === "hover") return { bg: null, border: dawn, text: dawn, borderOpacity: 0.3 };
    return { bg: null, border: dawn, text: dawn, borderOpacity: 0.08 };
  }
  return { bg: null, border: null, text: dawn };
}

async function createButtonSpecimen(variant: BtnVariant, size: BtnSize, state: BtnState): Promise<FrameNode> {
  const pad = SIZE_PADDING[size];
  const colors = btnColors(variant, state);

  const frame = createAutoLayoutFrame({
    name: `${variant}/${size}/${state}`,
    direction: "HORIZONTAL",
    spacing: 8,
    padding: { top: pad.v, right: pad.h, bottom: pad.v, left: pad.h },
  });
  frame.counterAxisAlignItems = "CENTER";

  if (colors.bg) {
    frame.fills = [solidPaint(colors.bg.r, colors.bg.g, colors.bg.b, (colors as any).bgOpacity ?? 1)];
  } else if ((colors as any).bgOpacity) {
    frame.fills = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b, (colors as any).bgOpacity)];
  } else {
    frame.fills = [];
  }

  if (colors.border) {
    frame.strokes = [solidPaint(colors.border.r, colors.border.g, colors.border.b, (colors as any).borderOpacity ?? 1)];
    frame.strokeWeight = 1;
  }

  const label = await createLabel({
    text: "Button",
    fontSize: pad.fontSize,
    font: FONTS.mono,
    color: colors.text as RGB,
    letterSpacing: pad.fontSize * 0.1,
  });

  if (state === "disabled") frame.opacity = 0.4;

  frame.appendChild(label);
  return frame;
}

export async function createButtonFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Buttons",
    direction: "VERTICAL",
    spacing: 48,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Buttons", fontSize: 34, font: { family: "IBM Plex Sans", style: "Bold" }, color: COLORS.dawn });
  container.appendChild(title);

  const variants: BtnVariant[] = ["primary", "secondary", "stroke", "transparent"];
  const sizes: BtnSize[] = ["sm", "md", "lg"];
  const states: BtnState[] = ["default", "hover", "active", "disabled"];

  for (const variant of variants) {
    const variantLabel = await createLabel({ text: variant, fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
    container.appendChild(variantLabel);

    for (const size of sizes) {
      const row = createAutoLayoutFrame({ name: `${variant}-${size}`, direction: "HORIZONTAL", spacing: 16 });
      row.counterAxisAlignItems = "CENTER";

      const sizeLabel = await createLabel({ text: size, fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
      sizeLabel.resize(32, sizeLabel.height);
      sizeLabel.textAutoResize = "NONE";
      sizeLabel.opacity = 0.4;
      row.appendChild(sizeLabel);

      for (const state of states) {
        const btn = await createButtonSpecimen(variant, size, state);
        row.appendChild(btn);
      }

      container.appendChild(row);
    }
  }

  return container;
}
