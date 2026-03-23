/**
 * Shared HUD grid constants for Sigil
 * Source: Figma TF node 120:968 "tf-hud-main-semantic dawn" (1920×1080 ref)
 * Right-rail individual tick elements (120:1191–1209) give exact viewport coordinates.
 */

/** Design reference viewport */
export const HUD_REF_WIDTH = 1920;
export const HUD_REF_HEIGHT = 1080;

/** Outer inset for corners / shell at reference (≈ --hud-margin at 1920px) */
export const HUD_OUTER_INSET_REF = 54;

/** Visual width of the rail aside container */
export const RAIL_WIDTH = 82;

/**
 * Offset from the rail aside left/right edge to the 1px guide hairline.
 * At 1920×1080: margin(54) + guide_inset(9) = 63px ≈ Figma guide at x=49px from edge.
 * Matches CSS --hud-rail-guide-inset at reference.
 */
export const RAIL_GUIDE_INSET = 9;

export const NAV_SPINE_GAP = 8;
export const NAV_SPINE_CARD_WIDTH = 280;

/**
 * Horizontal tick marks positioned within the guide zone (between corner stubs).
 * yPct = percentage of the GUIDE zone height (not the full rail height).
 * The guide zone is inset by --hud-corner-zone (~45px) at each end of the rail aside.
 *
 * Source coordinates (right rail, viewport px at 1920×1080):
 *   Guide start y=94.43, end y=985.57, zone height=891.14px
 *   Major ticks at y=369.33 (30.85%) and y=711.68 (69.27%) per Figma node 120:1201/1196.
 */
export type HudTickMark = {
  yPct: number;
  widthPx: 7 | 21;
  major: boolean;
};

export const TICK_MARKS: readonly HudTickMark[] = [
  { yPct:  0.11, widthPx: 7,  major: false },
  { yPct: 15.50, widthPx: 7,  major: false },
  { yPct: 23.17, widthPx: 7,  major: false },
  { yPct: 30.85, widthPx: 21, major: true  },
  { yPct: 38.53, widthPx: 7,  major: false },
  { yPct: 46.21, widthPx: 7,  major: false },
  { yPct: 53.90, widthPx: 7,  major: false },
  { yPct: 61.58, widthPx: 7,  major: false },
  { yPct: 69.27, widthPx: 21, major: true  },
  { yPct: 76.95, widthPx: 7,  major: false },
  { yPct: 84.63, widthPx: 7,  major: false },
  { yPct: 92.32, widthPx: 7,  major: false },
  { yPct: 100,   widthPx: 7,  major: false },
] as const;

export const TICK_DIRECTION = "outward" as const;
