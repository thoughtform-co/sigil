import { FONTS, COLORS } from "../tokens/thoughtformTokens";
import { solidPaint } from "./colorUtils";

type LabelOpts = {
  text: string;
  fontSize?: number;
  font?: FontName;
  color?: RGB;
  letterSpacing?: number;
  uppercase?: boolean;
  lineHeight?: number;
};

export async function createLabel(opts: LabelOpts): Promise<TextNode> {
  const font = opts.font ?? FONTS.mono;
  await figma.loadFontAsync(font);

  const node = figma.createText();
  node.fontName = font;
  node.fontSize = opts.fontSize ?? 12;
  node.characters = opts.uppercase !== false ? opts.text.toUpperCase() : opts.text;
  node.fills = [solidPaint(
    (opts.color ?? COLORS.dawn).r,
    (opts.color ?? COLORS.dawn).g,
    (opts.color ?? COLORS.dawn).b,
  )];
  node.textAutoResize = "HEIGHT";

  if (opts.letterSpacing !== undefined) {
    node.letterSpacing = { value: opts.letterSpacing, unit: "PIXELS" };
  }

  if (opts.lineHeight !== undefined) {
    node.lineHeight = { value: opts.lineHeight, unit: "PIXELS" };
  }

  return node;
}
