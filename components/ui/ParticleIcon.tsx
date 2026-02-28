type Pixel = { x: number; y: number; alpha: number };

type ParticleGlyph = "arrow" | "logo" | "settings" | "theme-light" | "theme-dark";
type ParticleSize = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<ParticleSize, { size: number; grid: number }> = {
  sm: { size: 12, grid: 2 },
  md: { size: 18, grid: 3 },
  lg: { size: 32, grid: 3 },
};

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

function arrowPixels(grid: number): Pixel[] {
  const s = grid === 2 ? 12 : 12;
  const mid = Math.floor(s / 2);
  return [
    { x: 1, y: mid, alpha: 0.45 },
    { x: 1 + grid, y: mid, alpha: 0.6 },
    { x: 1 + grid * 2, y: mid, alpha: 0.8 },
    { x: 1 + grid * 3, y: mid - grid, alpha: 1 },
    { x: 1 + grid * 3, y: mid, alpha: 1 },
    { x: 1 + grid * 3, y: mid + grid, alpha: 1 },
    { x: 1 + grid * 4, y: mid, alpha: 1 },
  ];
}

function logoPixels(size: number, grid: number): Pixel[] {
  const c = size / 2;
  const pts: Pixel[] = [];
  const r = size * 0.3125;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r, grid), y: snap(c + Math.sin(a) * r, grid), alpha: 0.95 });
  }
  for (let d = -Math.floor(r * 0.6); d <= Math.floor(r * 0.6); d += grid) {
    if (d !== 0) {
      pts.push({ x: snap(c + d, grid), y: snap(c, grid), alpha: 0.85 });
      pts.push({ x: snap(c, grid), y: snap(c + d, grid), alpha: 0.85 });
    }
  }
  pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 1 });
  const r2 = r * 0.4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r2, grid), y: snap(c + Math.sin(a) * r2, grid), alpha: 0.7 });
  }
  return pts;
}

function settingsPixels(size: number, grid: number): Pixel[] {
  const c = size / 2;
  const r = Math.floor(size * 0.28);
  const pts: Pixel[] = [];
  for (let d = -r; d <= r; d += grid) {
    if (d !== 0) {
      pts.push({ x: snap(c + d, grid), y: snap(c, grid), alpha: 0.85 });
      pts.push({ x: snap(c, grid), y: snap(c + d, grid), alpha: 0.85 });
    }
  }
  pts.push({ x: snap(c - r, grid), y: snap(c - r, grid), alpha: 0.7 });
  pts.push({ x: snap(c + r, grid), y: snap(c - r, grid), alpha: 0.7 });
  pts.push({ x: snap(c - r, grid), y: snap(c + r, grid), alpha: 0.7 });
  pts.push({ x: snap(c + r, grid), y: snap(c + r, grid), alpha: 0.7 });
  pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 1 });
  return pts;
}

function themePixels(size: number, grid: number, isLight: boolean): Pixel[] {
  const c = size / 2;
  const pts: Pixel[] = [];
  const r = Math.floor(size * 0.22);
  if (isLight) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: snap(c + Math.cos(a) * r, grid), y: snap(c + Math.sin(a) * r, grid), alpha: 0.8 });
    }
    pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 0.5 });
  } else {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: snap(c + Math.cos(a) * r, grid), y: snap(c + Math.sin(a) * r, grid), alpha: 0.85 });
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      pts.push({ x: snap(c + Math.cos(a) * (r + grid), grid), y: snap(c + Math.sin(a) * (r + grid), grid), alpha: 0.5 });
    }
    pts.push({ x: snap(c, grid), y: snap(c, grid), alpha: 1 });
  }
  return pts;
}

function getPixels(glyph: ParticleGlyph, size: number, grid: number): Pixel[] {
  switch (glyph) {
    case "arrow": return arrowPixels(grid);
    case "logo": return logoPixels(size, grid);
    case "settings": return settingsPixels(size, grid);
    case "theme-light": return themePixels(size, grid, true);
    case "theme-dark": return themePixels(size, grid, false);
  }
}

type ParticleIconProps = {
  glyph: ParticleGlyph;
  size?: ParticleSize;
  active?: boolean;
  light?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const DAWN_DARK = "236, 227, 214";
const DAWN_LIGHT = "17, 15, 9";
const GOLD_DARK = "202, 165, 84";
const GOLD_LIGHT = "154, 122, 46";

export function ParticleIcon({
  glyph,
  size = "sm",
  active = false,
  light = false,
  className,
  style,
}: ParticleIconProps) {
  const { size: px, grid } = SIZE_CONFIG[size];
  const pixels = getPixels(glyph, px, grid);
  const rgb = active
    ? (light ? GOLD_LIGHT : GOLD_DARK)
    : (light ? DAWN_LIGHT : DAWN_DARK);

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      aria-hidden="true"
      className={className}
      style={{ display: "block", imageRendering: "pixelated", ...style }}
    >
      {pixels.map((p, i) => (
        <rect
          key={`${p.x}-${p.y}-${i}`}
          x={p.x}
          y={p.y}
          width={grid - 1}
          height={grid - 1}
          fill={`rgba(${rgb}, ${p.alpha})`}
        />
      ))}
    </svg>
  );
}
