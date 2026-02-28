import { TYPE_SCALE, FONTS, COLORS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";
import { solidPaint } from "../helpers/colorUtils";

export async function createTypographyFrame(): Promise<FrameNode> {
  const container = createAutoLayoutFrame({
    name: "Typography",
    direction: "VERTICAL",
    spacing: 48,
    padding: 80,
    fill: COLORS.void,
    width: 1440,
  });
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "FIXED";

  const title = await createLabel({ text: "Typography", fontSize: 34, font: FONTS.sansBold, color: COLORS.dawn });
  container.appendChild(title);

  const subtitle = await createLabel({
    text: "Dual-track type scale: UI (12-24px) + Display (34-96px)",
    fontSize: 14,
    font: FONTS.sans,
    color: { r: COLORS.dawn.r, g: COLORS.dawn.g, b: COLORS.dawn.b },
    uppercase: false,
  });
  subtitle.opacity = 0.5;
  container.appendChild(subtitle);

  for (const step of TYPE_SCALE) {
    const row = createAutoLayoutFrame({ name: step.label, direction: "HORIZONTAL", spacing: 40 });
    row.counterAxisAlignItems = "CENTER";

    const specimen = await createLabel({
      text: step.px <= 24 ? "The quick brown fox" : "Heading",
      fontSize: step.px,
      font: step.px <= 24 ? FONTS.sans : FONTS.sansBold,
      color: COLORS.dawn,
      uppercase: false,
    });
    specimen.layoutSizingHorizontal = "FILL";
    row.appendChild(specimen);

    const meta = createAutoLayoutFrame({ name: "meta", direction: "VERTICAL", spacing: 4 });
    const details = [
      `${step.label}  ·  ${step.px}px`,
      step.px <= 24 ? "IBM Plex Sans" : "IBM Plex Sans Bold",
      step.role,
    ];
    for (const line of details) {
      const label = await createLabel({ text: line, fontSize: 10, color: COLORS.dawn, uppercase: false });
      label.opacity = 0.4;
      meta.appendChild(label);
    }
    row.appendChild(meta);
    container.appendChild(row);
  }

  const monoSection = await createLabel({ text: "Monospace (HUD / Data)", fontSize: 12, font: FONTS.mono, color: COLORS.gold });
  container.appendChild(monoSection);

  const monoSizes = [9, 10, 11, 12, 13];
  for (const sz of monoSizes) {
    const row = createAutoLayoutFrame({ name: `mono-${sz}`, direction: "HORIZONTAL", spacing: 24 });
    row.counterAxisAlignItems = "CENTER";

    const specimen = await createLabel({ text: `${sz}PX · MONO UPPERCASE · 0.08EM`, fontSize: sz, font: FONTS.mono, color: COLORS.dawn, letterSpacing: sz * 0.08 });
    row.appendChild(specimen);

    const note = await createLabel({ text: `${sz}px`, fontSize: 10, color: COLORS.dawn, uppercase: false });
    note.opacity = 0.3;
    row.appendChild(note);

    container.appendChild(row);
  }

  return container;
}
