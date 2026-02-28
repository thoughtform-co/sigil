import { createTypographyFrame } from "./generators/typography";
import { createSpacingFrame } from "./generators/spacing";
import { createColorFrame, createColorStyles } from "./generators/colors";
import { createButtonFrame } from "./generators/buttons";
import { createComponentFrame } from "./generators/components";
import { createParticleGrammarFrame } from "./generators/particleGrammar";
import { FONTS } from "./tokens/thoughtformTokens";

const PLUGIN_TAG = "sigil-ds-generated";
const SECTION_GAP = 200;
const PAGE_NAME = "→ Design System";

type SectionDef = {
  name: string;
  create: () => Promise<FrameNode>;
};

const SECTION_ORDER: SectionDef[] = [
  { name: "Typography", create: createTypographyFrame },
  { name: "Colors", create: createColorFrame },
  { name: "Spacing", create: createSpacingFrame },
  { name: "Buttons", create: createButtonFrame },
  { name: "Components", create: createComponentFrame },
  { name: "Particle Icon Grammar", create: createParticleGrammarFrame },
];

async function findOrCreateDesignSystemPage(): Promise<PageNode> {
  for (const page of figma.root.children) {
    if (page.name.includes("Design System")) return page;
  }
  const page = figma.createPage();
  page.name = PAGE_NAME;
  return page;
}

function removeGeneratedNodes(page: PageNode): number {
  const toRemove: SceneNode[] = [];
  for (const child of page.children) {
    if (child.getPluginData(PLUGIN_TAG) === "true") {
      toRemove.push(child);
    }
  }
  if (toRemove.length === 0) {
    const knownNames = new Set(SECTION_ORDER.map((s) => s.name));
    for (const child of page.children) {
      if ("name" in child && knownNames.has(child.name)) {
        toRemove.push(child);
      }
    }
  }
  for (const node of toRemove) node.remove();
  return toRemove.length;
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
  await figma.setCurrentPageAsync(page);

  status("Cleaning previous output...");
  removeGeneratedNodes(page);

  let yOffset = 0;

  for (const section of SECTION_ORDER) {
    status(`Generating ${section.name.toLowerCase()}...`);
    const frame = await section.create();
    frame.x = 0;
    frame.y = yOffset;
    frame.setPluginData(PLUGIN_TAG, "true");
    page.appendChild(frame);
    yOffset += frame.height + SECTION_GAP;
  }

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
