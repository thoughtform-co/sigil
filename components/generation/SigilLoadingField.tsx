"use client";

import { useRef, useEffect, useCallback } from "react";

const GRID = 3;
const GOLD = { r: 202, g: 165, b: 84 };
const DAWN = { r: 236, g: 227, b: 214 };

type Particle = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  ring: number;
};

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function createSigilParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.35;

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const r = scale * 0.8;
    particles.push({
      x: snap(cx + Math.cos(a) * r),
      y: snap(cy + Math.sin(a) * r),
      homeX: snap(cx + Math.cos(a) * r),
      homeY: snap(cy + Math.sin(a) * r),
      vx: 0, vy: 0,
      alpha: 0.9,
      size: GRID,
      ring: 0,
    });
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = scale * 0.5;
    particles.push({
      x: snap(cx + Math.cos(a) * r),
      y: snap(cy + Math.sin(a) * r),
      homeX: snap(cx + Math.cos(a) * r),
      homeY: snap(cy + Math.sin(a) * r),
      vx: 0, vy: 0,
      alpha: 0.6,
      size: GRID - 1,
      ring: 1,
    });
  }

  for (let d = -3; d <= 3; d++) {
    if (d === 0) continue;
    const off = d * GRID * 3;
    particles.push({
      x: snap(cx + off), y: snap(cy),
      homeX: snap(cx + off), homeY: snap(cy),
      vx: 0, vy: 0, alpha: 0.7, size: GRID - 1, ring: 2,
    });
    particles.push({
      x: snap(cx), y: snap(cy + off),
      homeX: snap(cx), homeY: snap(cy + off),
      vx: 0, vy: 0, alpha: 0.7, size: GRID - 1, ring: 2,
    });
  }

  particles.push({
    x: snap(cx), y: snap(cy),
    homeX: snap(cx), homeY: snap(cy),
    vx: 0, vy: 0, alpha: 1, size: GRID, ring: 3,
  });

  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = scale * (0.2 + Math.random() * 0.7);
    particles.push({
      x: snap(cx + Math.cos(a) * r),
      y: snap(cy + Math.sin(a) * r),
      homeX: snap(cx + Math.cos(a) * r),
      homeY: snap(cy + Math.sin(a) * r),
      vx: 0, vy: 0,
      alpha: 0.2 + Math.random() * 0.3,
      size: GRID - 1,
      ring: 4,
    });
  }

  return particles;
}

type SigilLoadingFieldProps = {
  seed?: string;
};

export function SigilLoadingField({ seed }: SigilLoadingFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const dimsRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);
  const seedOffset = seed ? seed.charCodeAt(0) * 0.01 : 0;

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
    particlesRef.current = createSigilParticles(w, h);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;
    const particles = particlesRef.current;
    timeRef.current += 0.016;
    const t = timeRef.current + seedOffset;

    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.06)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    const breathe = 0.8 + 0.2 * Math.sin(t * 1.2);
    const drift = Math.sin(t * 0.7) * 2;

    for (const p of particles) {
      let tx = p.homeX;
      let ty = p.homeY;

      if (p.ring <= 1) {
        const angle = Math.atan2(p.homeY - cy, p.homeX - cx);
        const dist = Math.sqrt((p.homeX - cx) ** 2 + (p.homeY - cy) ** 2);
        tx = cx + Math.cos(angle + t * 0.3) * dist * breathe;
        ty = cy + Math.sin(angle + t * 0.3) * dist * breathe;
      } else if (p.ring === 2) {
        tx = p.homeX + drift;
        ty = p.homeY + drift * 0.5;
      } else if (p.ring === 4) {
        tx = p.homeX + Math.sin(t * 0.5 + p.homeX * 0.1) * 4;
        ty = p.homeY + Math.cos(t * 0.5 + p.homeY * 0.1) * 4;
      }

      p.vx += (tx - p.x) * 0.04;
      p.vy += (ty - p.y) * 0.04;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;

      const isGold = p.ring <= 1 || p.ring === 3;
      const col = isGold ? GOLD : DAWN;
      const pulseAlpha = p.alpha * (0.7 + 0.3 * Math.sin(t * 1.5 + p.homeX * 0.05));
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${pulseAlpha})`;
      ctx.fillRect(snap(p.x), snap(p.y), p.size, p.size);
    }

    animRef.current = requestAnimationFrame(animate);
  }, [seedOffset]);

  useEffect(() => {
    setup();
    animRef.current = requestAnimationFrame(animate);

    const onResize = () => setup();
    window.addEventListener("resize", onResize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [setup, animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
    />
  );
}
