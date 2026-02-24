"use client";

import { useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// Elder Futhark runes (U+16A0 – U+16DF) + select occult symbols
// ─────────────────────────────────────────────────────────────────
const RUNES: string[] = [
  "\u{16A0}", "\u{16A2}", "\u{16A6}", "\u{16A8}", "\u{16AA}",
  "\u{16AC}", "\u{16AE}", "\u{16B1}", "\u{16B3}", "\u{16B7}",
  "\u{16B9}", "\u{16BB}", "\u{16BE}", "\u{16C1}", "\u{16C3}",
  "\u{16C5}", "\u{16C7}", "\u{16C9}", "\u{16CB}", "\u{16CF}",
  "\u{16D2}", "\u{16D6}", "\u{16D8}", "\u{16DA}", "\u{16DC}",
  "\u{16DE}", "\u{16E0}", "\u{16E3}", "\u{16E6}", "\u{16E8}",
  "\u{16EA}", "\u{16EC}", "\u{16EE}", "\u{16F0}",
  // Occult / alchemical
  "\u{263D}", "\u{2642}", "\u{2640}", "\u{2609}", "\u{26B9}",
  "\u{2729}", "\u{2739}",
];

function randomGlyph(): string {
  return RUNES[Math.floor(Math.random() * RUNES.length)];
}

// ─────────────────────────────────────────────────────────────────
// Column state
// ─────────────────────────────────────────────────────────────────
interface Column {
  x: number;
  y: number;
  chars: string[];
  length: number;
  speed: number;
}

function createColumn(x: number, canvasH: number): Column {
  const length = 8 + Math.floor(Math.random() * 18);
  return {
    x,
    y: -Math.floor(Math.random() * canvasH),
    chars: Array.from({ length }, randomGlyph),
    length,
    speed: 0.15 + Math.random() * 0.25,
  };
}

// ─────────────────────────────────────────────────────────────────
// Sigil palette (gold on void)
// ─────────────────────────────────────────────────────────────────
const BG = "#050403";
const GOLD = { h: 43, s: 55, l: 54 };

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export interface RunicRainProps {
  className?: string;
}

export function RunicRain({ className = "" }: RunicRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animRef = useRef<number | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const FONT_SIZE = 24;
  const COL_GAP = 34;

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    dimsRef.current = { w, h };

    const cols: Column[] = [];
    for (let x = 0; x < w; x += COL_GAP) {
      cols.push(createColumn(x, h));
    }
    columnsRef.current = cols;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const columns = columnsRef.current;
    ctx.textBaseline = "top";
    ctx.font = `${FONT_SIZE}px sans-serif`;

    for (const col of columns) {
      col.y += col.speed;

      if (col.y - col.length * FONT_SIZE > h) {
        Object.assign(col, createColumn(col.x, h));
      }

      for (let i = 0; i < col.length; i++) {
        const charY = Math.round(col.y + i * FONT_SIZE);
        if (charY < -FONT_SIZE || charY > h + FONT_SIZE) continue;

        const distFromHead = col.length - 1 - i;
        const normFade = distFromHead / col.length;

        if (i === col.length - 1) {
          ctx.shadowColor = `hsla(${GOLD.h}, ${GOLD.s}%, 60%, 0.35)`;
          ctx.shadowBlur = 14;
          ctx.fillStyle = `hsla(${GOLD.h}, 55%, 72%, 0.5)`;
          ctx.fillText(col.chars[i], col.x, charY);
          ctx.shadowBlur = 0;
        } else {
          const alpha = Math.max(0.03, 0.2 * (1 - normFade));
          const lightness = GOLD.l - normFade * 8;
          ctx.fillStyle = `hsla(${GOLD.h}, ${GOLD.s}%, ${lightness}%, ${alpha})`;
          ctx.fillText(col.chars[i], col.x, charY);
        }
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    setup();
    animRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      setup();
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [setup, animate]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ background: BG }}
      aria-hidden="true"
    />
  );
}
