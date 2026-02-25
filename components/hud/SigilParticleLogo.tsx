"use client";

import Link from "next/link";

const GRID = 3;
const LOGO_SIZE = 32;
const GOLD_RGB = "202, 165, 84";

type Pixel = { x: number; y: number; alpha: number };

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/** Abstract sigil glyph: diamond with inner cross (pixel-art rune style). */
function sigilLogoPixels(): Pixel[] {
  const c = LOGO_SIZE / 2;
  const pts: Pixel[] = [];
  const r = 10;
  // Diamond outline (4 corners)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r), y: snap(c + Math.sin(a) * r), alpha: 0.95 });
  }
  // Inner cross (horizontal and vertical bars through center)
  for (let d = -6; d <= 6; d += GRID) {
    if (d !== 0) {
      pts.push({ x: snap(c + d), y: snap(c), alpha: 0.85 });
      pts.push({ x: snap(c), y: snap(c + d), alpha: 0.85 });
    }
  }
  // Center point
  pts.push({ x: snap(c), y: snap(c), alpha: 1 });
  // Secondary diamond (smaller, inner)
  const r2 = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r2), y: snap(c + Math.sin(a) * r2), alpha: 0.7 });
  }
  return pts;
}

const pixels = sigilLogoPixels();

export function SigilParticleLogo() {
  return (
    <Link
      href="/dashboard"
      className="sigil-particle-logo"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
      }}
      title="SIGIL — Home"
      aria-label="SIGIL home"
    >
      <svg
        width={LOGO_SIZE}
        height={LOGO_SIZE}
        viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
        aria-hidden="true"
        style={{ display: "block", imageRendering: "pixelated" }}
      >
        {pixels.map((px, i) => (
          <rect
            key={`${px.x}-${px.y}-${i}`}
            x={px.x}
            y={px.y}
            width={GRID - 1}
            height={GRID - 1}
            fill={`rgba(${GOLD_RGB}, ${px.alpha})`}
          />
        ))}
      </svg>
    </Link>
  );
}
