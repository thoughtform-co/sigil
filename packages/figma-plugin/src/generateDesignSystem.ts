import { createTypographyFrame } from "./generators/typography";
import { createSpacingFrame } from "./generators/spacing";
import { createColorFrame, createColorStyles } from "./generators/colors";
import { createButtonFrame } from "./generators/buttons";
import { createComponentFrame } from "./generators/components";
import { createParticleGrammarFrame } from "./generators/particleGrammar";
import { FONTS } from "./tokens/thoughtformTokens";

async function findOrCreateDesignSystemPage(): Promise<PageNode> {
  const pages = figma.root.children;
  for (const page of pages) {
    if (page.name.includes("Design System")) {
      return page;
    }
  }
  const page = figma.createPage();
  page.name = "→ Design System";
  return page;
}

async function loadFonts(): Promise<void> {
  await figma.loadFontAsync(FONTS.mono);
  await figma.loadFontAsync(FONTS.sans);
  await figma.loadFontAsync(FONTS.sansMedium);
  await figma.loadFontAsync(FONTS.sansBold);
}

function status(text: string) {
  figma.ui.postMessage({ type: "status", text });
}

export async function generateDesignSystem(): Promise<void> {
  status("Loading fonts...");
  await loadFonts();

  const page = await findOrCreateDesignSystemPage();
  await page.loadAsync();
  figma.currentPage = page;

  let xOffset = 0;
  const GAP = 200;

  status("Generating typography...");
  const typo = await createTypographyFrame();
  typo.x = xOffset;
  typo.y = 0;
  page.appendChild(typo);
  xOffset += typo.width + GAP;

  status("Generating spacing...");
  const spacing = await createSpacingFrame();
  spacing.x = xOffset;
  spacing.y = 0;
  page.appendChild(spacing);
  xOffset += spacing.width + GAP;

  status("Generating colors...");
  const colors = await createColorFrame();
  colors.x = xOffset;
  colors.y = 0;
  page.appendChild(colors);
  xOffset += colors.width + GAP;

  status("Generating buttons...");
  const buttons = await createButtonFrame();
  buttons.x = xOffset;
  buttons.y = 0;
  page.appendChild(buttons);
  xOffset += buttons.width + GAP;

  status("Generating components...");
  const components = await createComponentFrame();
  components.x = xOffset;
  components.y = 0;
  page.appendChild(components);
  xOffset += components.width + GAP;

  status("Generating particle grammar...");
  const particles = await createParticleGrammarFrame();
  particles.x = xOffset;
  particles.y = 0;
  page.appendChild(particles);

  status("Creating Figma styles...");
  await createColorStyles();

  figma.viewport.scrollAndZoomIntoView(page.children);
}

export async function generateStylesOnly(): Promise<void> {
  status("Loading fonts...");
  await loadFonts();

  status("Creating color styles...");
  await createColorStyles();
}
