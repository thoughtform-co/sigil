import { COLORS, FONTS } from "../tokens/thoughtformTokens";
import { createAutoLayoutFrame, createAutoLayoutComponent } from "../helpers/createAutoLayoutFrame";
import { createLabel } from "../helpers/createLabel";
import { solidPaint } from "../helpers/colorUtils";

/* ── Helpers ───────────────────────────────────────────── */

function createDivider(width: number): RectangleNode {
  const divider = figma.createRectangle();
  divider.name = "divider";
  divider.resize(width, 1);
  divider.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  try { divider.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
  return divider;
}

function createCornerAccent(
  position: "TL" | "TR" | "BL" | "BR",
  visible: boolean,
): RectangleNode {
  const size = 14;
  const rect = figma.createRectangle();
  rect.name = `corner-${position}`;
  rect.resize(size, size);
  rect.fills = [];
  rect.opacity = visible ? 1 : 0;

  const goldStroke = solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b);
  const sides = { top: 0, right: 0, bottom: 0, left: 0 };

  if (position.includes("T")) sides.top = 1;
  if (position.includes("B")) sides.bottom = 1;
  if (position.includes("L")) sides.left = 1;
  if (position.includes("R")) sides.right = 1;

  rect.strokes = [goldStroke];
  rect.strokeWeight = 1;
  try {
    (rect as any).individualStrokeWeights = sides;
  } catch (_) { /* API may not support individual strokes in older plugin versions */ }

  return rect;
}

type CardStateConfig = {
  name: string;
  bg: RGB;
  strokeColor: RGB;
  strokeOpacity: number;
  cornersVisible: boolean;
  titleColor?: RGB;
  titleOpacity?: number;
};

const CARD_STATES: CardStateConfig[] = [
  { name: "Default", bg: COLORS.surface0, strokeColor: COLORS.dawn, strokeOpacity: 0.08, cornersVisible: false },
  { name: "Hover", bg: COLORS.surface0, strokeColor: COLORS.dawn, strokeOpacity: 0.08, cornersVisible: true },
  { name: "Selected", bg: COLORS.gold, strokeColor: COLORS.gold, strokeOpacity: 0.3, cornersVisible: true, titleColor: COLORS.gold },
  { name: "Active", bg: COLORS.gold, strokeColor: COLORS.gold, strokeOpacity: 1, cornersVisible: true, titleColor: COLORS.gold },
  { name: "Dim", bg: COLORS.surface0, strokeColor: COLORS.dawn, strokeOpacity: 0.04, cornersVisible: false, titleOpacity: 0.4 },
];

/* ── Diamond specimens ─────────────────────────────────── */

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
    nameLabel.textAutoResize = "WIDTH_AND_HEIGHT";
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

/* ── CardFrame state specimens ─────────────────────────── */

async function createCardFrameStateSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "CardFrame · States", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "CardFrame · States", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const row = createAutoLayoutFrame({ name: "states-row", direction: "HORIZONTAL", spacing: 24 });
  group.appendChild(row);

  for (const state of CARD_STATES) {
    const bgOpacity = state.name === "Selected" ? 0.1 : state.name === "Active" ? 0.1 : 1;
    const card = createAutoLayoutComponent({
      name: `CardFrame/${state.name}`,
      direction: "VERTICAL",
      spacing: 12,
      padding: { top: 12, right: 20, bottom: 20, left: 20 },
      fill: state.bg,
      fillOpacity: bgOpacity,
      width: 260,
    });
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.strokes = [solidPaint(state.strokeColor.r, state.strokeColor.g, state.strokeColor.b, state.strokeOpacity)];
    card.strokeWeight = 1;

    const stateLabel = await createLabel({ text: state.name, fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
    stateLabel.opacity = 0.5;
    card.appendChild(stateLabel);

    card.appendChild(createDivider(220));

    const titleLabel = await createLabel({
      text: "Card Title",
      fontSize: 13,
      color: state.titleColor ?? COLORS.dawn,
      letterSpacing: 1.04,
    });
    if (state.titleOpacity) titleLabel.opacity = state.titleOpacity;
    card.appendChild(titleLabel);

    const desc = await createLabel({
      text: "Content goes here",
      fontSize: 12,
      font: FONTS.sans,
      color: COLORS.dawn,
      uppercase: false,
    });
    desc.opacity = 0.5;
    card.appendChild(desc);

    row.appendChild(card);
  }

  return group;
}

/* ── JourneyCardCompact size variants ──────────────────── */

type SizeVariant = {
  name: string;
  width: number;
  padding: { top: number; right: number; bottom: number; left: number };
  titleFontSize: number;
  statsFontSize: number;
  showDivider: boolean;
  showStats: boolean;
};

const SIZE_VARIANTS: SizeVariant[] = [
  { name: "Default", width: 280, padding: { top: 10, right: 14, bottom: 14, left: 14 }, titleFontSize: 12, statsFontSize: 9, showDivider: true, showStats: true },
  { name: "Compact", width: 240, padding: { top: 8, right: 12, bottom: 12, left: 12 }, titleFontSize: 11, statsFontSize: 8, showDivider: true, showStats: true },
  { name: "Mini", width: 200, padding: { top: 6, right: 10, bottom: 10, left: 10 }, titleFontSize: 11, statsFontSize: 8, showDivider: false, showStats: false },
];

async function createJourneyCardCompactSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "JourneyCardCompact · Sizes", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "JourneyCardCompact · Sizes", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  for (const variant of SIZE_VARIANTS) {
    const variantGroup = createAutoLayoutFrame({ name: variant.name, direction: "HORIZONTAL", spacing: 16 });
    group.appendChild(variantGroup);

    const variantLabel = await createLabel({ text: variant.name, fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
    variantLabel.opacity = 0.4;
    variantLabel.textAutoResize = "WIDTH_AND_HEIGHT";
    variantLabel.resize(60, variantLabel.height);
    variantGroup.appendChild(variantLabel);

    for (const selected of [false, true]) {
      const bgFill = selected ? COLORS.gold : COLORS.surface0;
      const bgOpacity = selected ? 0.1 : 1;
      const strokeColor = selected ? COLORS.gold : COLORS.dawn;
      const strokeOpacity = selected ? 0.3 : 0.08;

      const card = createAutoLayoutComponent({
        name: `JourneyCardCompact/${variant.name}${selected ? " Selected" : ""}`,
        direction: "VERTICAL",
        spacing: 0,
        padding: variant.padding,
        fill: bgFill,
        fillOpacity: bgOpacity,
        width: variant.width,
      });
      card.primaryAxisSizingMode = "AUTO";
      card.counterAxisSizingMode = "FIXED";
      card.strokes = [solidPaint(strokeColor.r, strokeColor.g, strokeColor.b, strokeOpacity)];
      card.strokeWeight = 1;

      const diamondRow = createAutoLayoutFrame({ name: "category", direction: "HORIZONTAL", spacing: 6 });
      diamondRow.counterAxisAlignItems = "CENTER";

      const diamond = figma.createRectangle();
      diamond.name = "diamond";
      diamond.resize(6, 6);
      diamond.rotation = 45;
      diamond.fills = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b)];
      diamondRow.appendChild(diamond);

      const catLabel = await createLabel({ text: "create", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
      catLabel.opacity = 0.4;
      diamondRow.appendChild(catLabel);
      card.appendChild(diamondRow);

      if (variant.showDivider) {
        const spacer = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
        spacer.resize(variant.width - variant.padding.left - variant.padding.right, 8);
        spacer.fills = [];
        card.appendChild(spacer);
        card.appendChild(createDivider(variant.width - variant.padding.left - variant.padding.right));
        const spacer2 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
        spacer2.resize(variant.width - variant.padding.left - variant.padding.right, 8);
        spacer2.fills = [];
        card.appendChild(spacer2);
      }

      const titleColor = selected ? COLORS.gold : COLORS.dawn;
      const titleLabel = await createLabel({
        text: "Journey Name",
        fontSize: variant.titleFontSize,
        color: titleColor,
        letterSpacing: variant.titleFontSize * 0.08,
      });
      card.appendChild(titleLabel);

      if (variant.showStats) {
        const spacer3 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
        spacer3.resize(variant.width - variant.padding.left - variant.padding.right, 6);
        spacer3.fills = [];
        card.appendChild(spacer3);

        const statsColor = selected ? COLORS.gold : COLORS.dawn;
        const statsLabel = await createLabel({
          text: "3 routes   0 gen",
          fontSize: variant.statsFontSize,
          color: statsColor,
          letterSpacing: 0.45,
        });
        statsLabel.opacity = selected ? 0.7 : 0.5;
        card.appendChild(statsLabel);
      }

      variantGroup.appendChild(card);
    }
  }

  return group;
}

/* ── Content card (RouteCard / ProjectCard) ─────────────── */

async function createContentCardSpecimen(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "ContentCard · Route / Project", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "ContentCard · Route / Project", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const card = createAutoLayoutComponent({
    name: "ContentCard/Default",
    direction: "VERTICAL",
    spacing: 0,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    fill: COLORS.surface0,
    width: 400,
  });
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.strokes = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  card.strokeWeight = 1;

  const headerRow = createAutoLayoutFrame({ name: "header", direction: "HORIZONTAL", spacing: 8 });
  try { headerRow.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
  headerRow.counterAxisAlignItems = "CENTER";

  const titleLabel = await createLabel({ text: "Route Name", fontSize: 13, color: COLORS.dawn, letterSpacing: 1.04 });
  headerRow.appendChild(titleLabel);

  const spacerH = createAutoLayoutFrame({ name: "spacer", direction: "HORIZONTAL", spacing: 0 });
  spacerH.fills = [];
  spacerH.layoutGrow = 1;
  spacerH.resize(10, 1);
  headerRow.appendChild(spacerH);

  const openLabel = await createLabel({ text: "open →", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
  openLabel.opacity = 0.7;
  headerRow.appendChild(openLabel);
  card.appendChild(headerRow);

  const spacer1 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
  spacer1.resize(360, 12);
  spacer1.fills = [];
  card.appendChild(spacer1);

  const desc = await createLabel({
    text: "Description text for the route or project goes here.",
    fontSize: 12,
    font: FONTS.sans,
    color: COLORS.dawn,
    uppercase: false,
  });
  desc.opacity = 0.5;
  card.appendChild(desc);

  const spacer2 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
  spacer2.resize(360, 16);
  spacer2.fills = [];
  card.appendChild(spacer2);

  card.appendChild(createDivider(360));

  const spacer3 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
  spacer3.resize(360, 12);
  spacer3.fills = [];
  card.appendChild(spacer3);

  const statsCol = createAutoLayoutFrame({ name: "stats", direction: "VERTICAL", spacing: 4 });

  const wptLabel = await createLabel({ text: "3 waypoints", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.45 });
  wptLabel.opacity = 0.7;
  statsCol.appendChild(wptLabel);

  const dateLabel = await createLabel({ text: "updated 03/05/2026", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.45 });
  dateLabel.opacity = 0.7;
  statsCol.appendChild(dateLabel);

  card.appendChild(statsCol);
  group.appendChild(card);

  return group;
}

/* ── Dashboard RouteCard (media card) ──────────────────── */

async function createMediaCardSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "MediaCard · Dashboard Route", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "MediaCard · Dashboard Route", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const row = createAutoLayoutFrame({ name: "media-cards-row", direction: "HORIZONTAL", spacing: 24 });
  group.appendChild(row);

  for (const isActive of [false, true]) {
    const cardWidth = isActive ? 400 : 280;
    const aspectHeight = Math.round(cardWidth * (4 / 3));

    const card = createAutoLayoutComponent({
      name: `MediaCard/${isActive ? "Active" : "Inactive"}`,
      direction: "VERTICAL",
      spacing: 0,
      fill: COLORS.surface0,
      width: cardWidth,
      height: aspectHeight,
    });
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.opacity = isActive ? 1 : 0.5;
    card.cornerRadius = 0;
    card.clipsContent = true;

    const imagePlaceholder = createAutoLayoutFrame({
      name: "image-area",
      direction: "VERTICAL",
      fill: COLORS.surface1,
    });
    imagePlaceholder.layoutGrow = 1;
    try { imagePlaceholder.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
    imagePlaceholder.fills = [solidPaint(COLORS.surface1.r, COLORS.surface1.g, COLORS.surface1.b)];

    const imgLabel = await createLabel({
      text: isActive ? "▶ Video / Image" : "Image",
      fontSize: 11,
      color: COLORS.dawn,
      letterSpacing: 0.6,
    });
    imgLabel.opacity = 0.2;
    imagePlaceholder.counterAxisAlignItems = "CENTER";
    imagePlaceholder.primaryAxisAlignItems = "CENTER";
    imagePlaceholder.appendChild(imgLabel);
    card.appendChild(imagePlaceholder);

    const dataPanel = createAutoLayoutFrame({
      name: "data-panel",
      direction: "VERTICAL",
      spacing: 8,
      padding: isActive ? { top: 12, right: 14, bottom: 14, left: 14 } : { top: 10, right: 12, bottom: 12, left: 12 },
      fill: COLORS.surface0,
    });
    try { dataPanel.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
    dataPanel.strokes = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, isActive ? 0.12 : 0.08)];
    dataPanel.strokesIncludedInLayout = false;
    try {
      (dataPanel as any).individualStrokeWeights = { top: 1, right: 0, bottom: 0, left: 0 };
    } catch (_) { /* ok */ }

    const nameLabel = await createLabel({
      text: "Route Name",
      fontSize: isActive ? 12 : 10,
      color: COLORS.dawn,
      letterSpacing: isActive ? 0.96 : 0.8,
    });
    nameLabel.opacity = isActive ? 1 : 0.7;
    dataPanel.appendChild(nameLabel);

    const telemetry = createAutoLayoutFrame({ name: "telemetry", direction: "HORIZONTAL", spacing: isActive ? 16 : 12 });

    for (const stat of [{ label: "WPT", value: "003" }, { label: "GEN", value: "012" }, { label: "UPDT", value: "03/05" }]) {
      const col = createAutoLayoutFrame({ name: stat.label, direction: "VERTICAL", spacing: 2 });
      const lbl = await createLabel({ text: stat.label, fontSize: 7, color: COLORS.dawn, letterSpacing: 0.84 });
      lbl.opacity = 0.3;
      col.appendChild(lbl);
      const val = await createLabel({ text: stat.value, fontSize: isActive ? 12 : 10, color: COLORS.dawn, letterSpacing: 0.4 });
      val.opacity = 0.7;
      col.appendChild(val);
      telemetry.appendChild(col);
    }

    dataPanel.appendChild(telemetry);

    if (isActive) {
      const diamonds = createAutoLayoutFrame({ name: "diamond-sockets", direction: "HORIZONTAL", spacing: 5 });
      for (let i = 0; i < 4; i++) {
        const d = figma.createRectangle();
        d.name = `socket-${i}`;
        d.resize(6, 6);
        d.rotation = 45;
        d.fills = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b, i < 2 ? 0.3 : 0.15)];
        diamonds.appendChild(d);
      }
      dataPanel.appendChild(diamonds);
    }

    card.appendChild(dataPanel);

    const stateTag = await createLabel({
      text: isActive ? "Active" : "Inactive",
      fontSize: 9,
      color: COLORS.dawn,
      letterSpacing: 0.72,
    });
    stateTag.opacity = 0.4;

    const wrapper = createAutoLayoutFrame({
      name: `media-${isActive ? "active" : "inactive"}`,
      direction: "VERTICAL",
      spacing: 8,
    });
    wrapper.appendChild(stateTag);
    wrapper.appendChild(card);
    row.appendChild(wrapper);
  }

  return group;
}

/* ── Card presentation: Filled vs Line ─────────────────── */

async function createPresentationSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "CardFrame · Presentation", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "CardFrame · Filled vs Line", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const row = createAutoLayoutFrame({ name: "presentations-row", direction: "HORIZONTAL", spacing: 32 });
  group.appendChild(row);

  const filledCard = createAutoLayoutComponent({
    name: "CardFrame/Filled",
    direction: "VERTICAL",
    spacing: 8,
    padding: { top: 10, right: 14, bottom: 14, left: 14 },
    fill: COLORS.surface0,
    width: 260,
  });
  filledCard.primaryAxisSizingMode = "AUTO";
  filledCard.counterAxisSizingMode = "FIXED";
  filledCard.strokes = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  filledCard.strokeWeight = 1;
  const filledTitle = await createLabel({ text: "Filled Card", fontSize: 12, color: COLORS.dawn, letterSpacing: 0.96 });
  filledCard.appendChild(filledTitle);
  const filledStats = await createLabel({ text: "3 routes   0 gen", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.45 });
  filledStats.opacity = 0.5;
  filledCard.appendChild(filledStats);

  const filledLabel = await createLabel({ text: "Filled (default)", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
  filledLabel.opacity = 0.4;
  const filledWrap = createAutoLayoutFrame({ name: "filled-wrap", direction: "VERTICAL", spacing: 8 });
  filledWrap.appendChild(filledLabel);
  filledWrap.appendChild(filledCard);
  row.appendChild(filledWrap);

  const lineCard = createAutoLayoutComponent({
    name: "CardFrame/Line",
    direction: "VERTICAL",
    spacing: 4,
    width: 260,
  });
  lineCard.primaryAxisSizingMode = "AUTO";
  lineCard.counterAxisSizingMode = "FIXED";
  lineCard.fills = [];
  const lineTitle = await createLabel({ text: "Line Card", fontSize: 11, color: COLORS.dawn, letterSpacing: 0.88 });
  lineCard.appendChild(lineTitle);
  const lineRule = figma.createRectangle();
  lineRule.name = "underline";
  lineRule.resize(260, 1);
  lineRule.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  try { lineRule.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
  lineCard.appendChild(lineRule);

  const lineLabel = await createLabel({ text: "Line (stripped)", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
  lineLabel.opacity = 0.4;
  const lineWrap = createAutoLayoutFrame({ name: "line-wrap", direction: "VERTICAL", spacing: 8 });
  lineWrap.appendChild(lineLabel);
  lineWrap.appendChild(lineCard);
  row.appendChild(lineWrap);

  return group;
}

/* ── Journey tree specimens ────────────────────────────── */

async function createJourneyTreeSpecimens(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "JourneyTree · Dashboard", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "JourneyTree · Collapsed / Expanded", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const row = createAutoLayoutFrame({ name: "tree-row", direction: "HORIZONTAL", spacing: 40 });
  group.appendChild(row);

  for (const expanded of [false, true]) {
    const col = createAutoLayoutFrame({
      name: expanded ? "Expanded" : "Collapsed",
      direction: "VERTICAL",
      spacing: 0,
      width: 280,
    });
    col.primaryAxisSizingMode = "AUTO";
    col.counterAxisSizingMode = "FIXED";

    const stateLabel = await createLabel({
      text: expanded ? "Expanded (selected)" : "Collapsed",
      fontSize: 9,
      color: COLORS.dawn,
      letterSpacing: 0.72,
    });
    stateLabel.opacity = 0.4;
    col.appendChild(stateLabel);

    const spacer1 = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
    spacer1.resize(280, 8);
    spacer1.fills = [];
    col.appendChild(spacer1);

    const card = createAutoLayoutComponent({
      name: `JourneyTree/${expanded ? "Expanded" : "Collapsed"}`,
      direction: "VERTICAL",
      spacing: 6,
      padding: { top: 10, right: 14, bottom: 14, left: 14 },
      fill: expanded ? COLORS.gold : COLORS.surface0,
      fillOpacity: expanded ? 0.1 : 1,
      width: 280,
    });
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.strokes = [solidPaint(
      expanded ? COLORS.gold.r : COLORS.dawn.r,
      expanded ? COLORS.gold.g : COLORS.dawn.g,
      expanded ? COLORS.gold.b : COLORS.dawn.b,
      expanded ? 0.3 : 0.08,
    )];
    card.strokeWeight = 1;

    const catRow = createAutoLayoutFrame({ name: "category", direction: "HORIZONTAL", spacing: 6 });
    catRow.counterAxisAlignItems = "CENTER";
    const diamond = figma.createRectangle();
    diamond.resize(6, 6);
    diamond.rotation = 45;
    diamond.fills = [solidPaint(COLORS.gold.r, COLORS.gold.g, COLORS.gold.b)];
    catRow.appendChild(diamond);
    const catText = await createLabel({ text: "create", fontSize: 9, color: COLORS.dawn, letterSpacing: 0.72 });
    catText.opacity = 0.4;
    catRow.appendChild(catText);
    card.appendChild(catRow);
    card.appendChild(createDivider(252));

    const titleText = await createLabel({
      text: "Journey Name",
      fontSize: 12,
      color: expanded ? COLORS.gold : COLORS.dawn,
      letterSpacing: 0.96,
    });
    card.appendChild(titleText);
    col.appendChild(card);

    if (expanded) {
      const treeArea = createAutoLayoutFrame({ name: "route-tree", direction: "VERTICAL", spacing: 6, padding: { top: 8, right: 0, bottom: 0, left: 24 } });
      treeArea.fills = [];
      for (let i = 0; i < 3; i++) {
        const routeRow = await createLabel({
          text: `Route ${i + 1}`,
          fontSize: 10,
          color: COLORS.dawn,
          letterSpacing: 0.6,
        });
        routeRow.opacity = i === 0 ? 0.7 : 0.5;
        treeArea.appendChild(routeRow);
        const routeDivider = figma.createRectangle();
        routeDivider.resize(220, 1);
        routeDivider.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
        try { routeDivider.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
        treeArea.appendChild(routeDivider);
      }
      col.appendChild(treeArea);
    }

    row.appendChild(col);
  }

  return group;
}

/* ── Route-page spine specimen ─────────────────────────── */

async function createRouteSpineSpecimen(): Promise<FrameNode> {
  const group = createAutoLayoutFrame({ name: "RoutePage · Spine", direction: "VERTICAL", spacing: 24 });

  const sectionLabel = await createLabel({ text: "RoutePage · Journey + Route Branch", fontSize: 12, color: COLORS.gold, letterSpacing: 1.2 });
  group.appendChild(sectionLabel);

  const specimen = createAutoLayoutComponent({
    name: "RouteSpine/Default",
    direction: "VERTICAL",
    spacing: 0,
    width: 280,
  });
  specimen.primaryAxisSizingMode = "AUTO";
  specimen.counterAxisSizingMode = "FIXED";
  specimen.fills = [];

  const journeyTitle = await createLabel({ text: "Journey Name", fontSize: 11, color: COLORS.dawn, letterSpacing: 0.88 });
  specimen.appendChild(journeyTitle);

  const journeyRule = figma.createRectangle();
  journeyRule.resize(280, 1);
  journeyRule.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  try { journeyRule.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }

  const rulespacer = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
  rulespacer.resize(280, 6);
  rulespacer.fills = [];
  specimen.appendChild(rulespacer);
  specimen.appendChild(journeyRule);

  const branchArea = createAutoLayoutFrame({
    name: "route-branch",
    direction: "VERTICAL",
    spacing: 0,
    padding: { top: 8, right: 0, bottom: 0, left: 20 },
  });
  branchArea.fills = [];

  const routeLabel = await createLabel({ text: "Current Route", fontSize: 10, color: COLORS.dawn, letterSpacing: 0.6 });
  routeLabel.opacity = 0.5;
  branchArea.appendChild(routeLabel);

  const routespacer = createAutoLayoutFrame({ name: "spacer", direction: "VERTICAL", spacing: 0 });
  routespacer.resize(260, 4);
  routespacer.fills = [];
  branchArea.appendChild(routespacer);

  const routeRule = figma.createRectangle();
  routeRule.resize(260, 1);
  routeRule.fills = [solidPaint(COLORS.dawn.r, COLORS.dawn.g, COLORS.dawn.b, 0.08)];
  try { routeRule.layoutSizingHorizontal = "FILL"; } catch (_) { /* ok */ }
  branchArea.appendChild(routeRule);

  specimen.appendChild(branchArea);
  group.appendChild(specimen);

  return group;
}

/* ── Main export ───────────────────────────────────────── */

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

  container.appendChild(await createDiamondSpecimens());
  container.appendChild(await createCardFrameStateSpecimens());
  container.appendChild(await createPresentationSpecimens());
  container.appendChild(await createJourneyCardCompactSpecimens());
  container.appendChild(await createJourneyTreeSpecimens());
  container.appendChild(await createContentCardSpecimen());
  container.appendChild(await createMediaCardSpecimens());
  container.appendChild(await createRouteSpineSpecimen());

  return container;
}
