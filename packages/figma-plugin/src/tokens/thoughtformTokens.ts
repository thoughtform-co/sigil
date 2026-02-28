export const COLORS = {
  void: { r: 5/255, g: 4/255, b: 3/255 },
  surface0: { r: 10/255, g: 9/255, b: 8/255 },
  surface1: { r: 15/255, g: 14/255, b: 12/255 },
  surface2: { r: 20/255, g: 18/255, b: 16/255 },
  dawn: { r: 236/255, g: 227/255, b: 214/255 },
  gold: { r: 202/255, g: 165/255, b: 84/255 },
  atreides: { r: 42/255, g: 48/255, b: 37/255 },
  atreidesLight: { r: 61/255, g: 75/255, b: 51/255 },
  nebulae: { r: 27/255, g: 33/255, b: 48/255 },
  spice: { r: 166/255, g: 124/255, b: 82/255 },
  statusSuccess: { r: 91/255, g: 138/255, b: 122/255 },
  statusError: { r: 193/255, g: 127/255, b: 89/255 },
  // Light mode
  voidLight: { r: 236/255, g: 227/255, b: 214/255 },
  dawnLight: { r: 17/255, g: 15/255, b: 9/255 },
  goldLight: { r: 154/255, g: 122/255, b: 46/255 },
} as const;

export const DAWN_OPACITIES = [
  { name: "dawn-70", opacity: 0.7 },
  { name: "dawn-50", opacity: 0.5 },
  { name: "dawn-40", opacity: 0.4 },
  { name: "dawn-30", opacity: 0.3 },
  { name: "dawn-15", opacity: 0.15 },
  { name: "dawn-12", opacity: 0.12 },
  { name: "dawn-08", opacity: 0.08 },
  { name: "dawn-04", opacity: 0.04 },
] as const;

export const GOLD_OPACITIES = [
  { name: "gold-30", opacity: 0.3 },
  { name: "gold-20", opacity: 0.2 },
  { name: "gold-15", opacity: 0.15 },
  { name: "gold-10", opacity: 0.1 },
] as const;

export const SPACING_SCALE = [
  { index: 0, px: 0, label: "space-0" },
  { index: 1, px: 2, label: "space-1" },
  { index: 2, px: 4, label: "space-2" },
  { index: 3, px: 8, label: "space-3" },
  { index: 4, px: 12, label: "space-4" },
  { index: 5, px: 16, label: "space-5" },
  { index: 6, px: 24, label: "space-6" },
  { index: 7, px: 32, label: "space-7" },
  { index: 8, px: 40, label: "space-8" },
  { index: 9, px: 48, label: "space-9" },
  { index: 10, px: 64, label: "space-10" },
  { index: 11, px: 80, label: "space-11" },
  { index: 12, px: 96, label: "space-12" },
  { index: 13, px: 160, label: "space-13" },
] as const;

export const TYPE_SCALE = [
  { index: 0, px: 12, label: "type-0", role: "Captions, labels" },
  { index: 1, px: 14, label: "type-1", role: "Body small" },
  { index: 2, px: 16, label: "type-2", role: "Body default" },
  { index: 3, px: 20, label: "type-3", role: "Sub-headings" },
  { index: 4, px: 24, label: "type-4", role: "Section headings" },
  { index: 5, px: 34, label: "type-5", role: "Display small" },
  { index: 6, px: 48, label: "type-6", role: "Display medium" },
  { index: 7, px: 60, label: "type-7", role: "Display large" },
  { index: 8, px: 96, label: "type-8", role: "Hero / readout" },
] as const;

export const FONTS = {
  mono: { family: "PT Mono", style: "Regular" },
  monoBold: { family: "PT Mono", style: "Bold" },
  sans: { family: "IBM Plex Sans", style: "Regular" },
  sansMedium: { family: "IBM Plex Sans", style: "Medium" },
  sansBold: { family: "IBM Plex Sans", style: "Bold" },
} as const;

export const TRACKING = {
  normal: 0,
  ui: 0.2,       // ~0.0125em at 16px
  caps: 0.64,    // ~0.04em at 16px
} as const;

export const LEADING = {
  tight: 1.1,
  ui: 1.3,
  body: 1.5,
} as const;
