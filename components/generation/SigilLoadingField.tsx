"use client";

import { useRef, useEffect, useCallback } from "react";

const GRID = 3;
const GOLD = { r: 202, g: 165, b: 84 };
const DAWN = { r: 236, g: 227, b: 214 };
const PARTICLE_COUNT = 140;
const TEXT_SAFE_HALF = 18;

function estimateGenerationSeconds(modelId: string): number {
  if (!modelId) return 40;
  const id = modelId.toLowerCase();
  if (id.includes("kling")) return 120;
  if (id.includes("veo")) return 90;
  if (id.includes("gemini") || id.includes("nano-banana")) return 30;
  if (id.includes("seedream") || id.includes("reve")) return 45;
  return 40;
}

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

type Particle = {
  x: number;
  y: number;
  homeAngle: number;
  homeRadius: number;
  normalizedR: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  size: number;
  isGold: boolean;
  angularDrift: number;
  jitterPhase: number;
};

function createParticles(w: number, h: number, seed: number): Particle[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const rand = seededRandom(seed);
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    const rNorm = rand();
    const radius = rNorm * maxR;
    const isGold = rNorm < 0.35 || rand() < 0.15;

    particles.push({
      x: snap(cx),
      y: snap(cy),
      homeAngle: angle,
      homeRadius: radius,
      normalizedR: rNorm,
      vx: 0,
      vy: 0,
      baseAlpha: 0.25 + rand() * 0.55,
      size: rand() < 0.3 ? GRID : GRID - 1,
      isGold,
      angularDrift: (rand() - 0.5) * 0.4,
      jitterPhase: rand() * Math.PI * 2,
    });
  }

  particles.push({
    x: snap(cx),
    y: snap(cy),
    homeAngle: 0,
    homeRadius: 0,
    normalizedR: 0,
    vx: 0,
    vy: 0,
    baseAlpha: 1,
    size: GRID,
    isGold: true,
    angularDrift: 0,
    jitterPhase: 0,
  });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    particles.push({
      x: snap(cx),
      y: snap(cy),
      homeAngle: a,
      homeRadius: Math.min(w, h) * 0.12,
      normalizedR: 0.08,
      vx: 0,
      vy: 0,
      baseAlpha: 0.9,
      size: GRID,
      isGold: true,
      angularDrift: 0,
      jitterPhase: i * 1.5,
    });
  }

  for (let d = -4; d <= 4; d++) {
    if (d === 0) continue;
    const off = Math.abs(d) / 4;
    particles.push({
      x: snap(cx),
      y: snap(cy),
      homeAngle: d > 0 ? 0 : Math.PI,
      homeRadius: Math.abs(d) * GRID * 4,
      normalizedR: off * 0.15,
      vx: 0, vy: 0,
      baseAlpha: 0.6,
      size: GRID - 1,
      isGold: true,
      angularDrift: 0,
      jitterPhase: d,
    });
    particles.push({
      x: snap(cx),
      y: snap(cy),
      homeAngle: d > 0 ? Math.PI / 2 : -Math.PI / 2,
      homeRadius: Math.abs(d) * GRID * 4,
      normalizedR: off * 0.15,
      vx: 0, vy: 0,
      baseAlpha: 0.6,
      size: GRID - 1,
      isGold: true,
      angularDrift: 0,
      jitterPhase: d + 10,
    });
  }

  return particles;
}

type SigilLoadingFieldProps = {
  seed?: string;
  createdAt?: string;
  modelId?: string;
};

export function SigilLoadingField({ seed, createdAt, modelId }: SigilLoadingFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const dimsRef = useRef({ w: 0, h: 0 });

  const seedNum = seed ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 42;
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const expectedSeconds = estimateGenerationSeconds(modelId ?? "");

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
    particlesRef.current = createParticles(w, h, seedNum);
  }, [seedNum]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;
    if (w === 0 || h === 0) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }

    const particles = particlesRef.current;
    const now = Date.now();
    const elapsed = Math.max(0, (now - createdAtMs) / 1000);
    const raw = elapsed / expectedSeconds;
    const progress = 1 - 1 / (1 + raw * 1.8);
    const t = elapsed;

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    ctx.clearRect(0, 0, w, h);

    const crossSize = 14 + progress * 10;
    const crossAlpha = 0.04 + progress * 0.04;
    ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${crossAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    const waveCount = Math.floor(progress * 4);
    for (let i = 0; i <= waveCount; i++) {
      const waveR = (i + 1) / 5 * maxR * progress;
      if (waveR < 8) continue;
      const waveAlpha = 0.03 * (1 - i / 5);
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${waveAlpha})`;
      ctx.beginPath();
      const half = GRID * 0.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
        const px = snap(cx + Math.cos(a) * waveR);
        const py = snap(cy + Math.sin(a) * waveR);
        ctx.moveTo(px, py);
        ctx.lineTo(px + half, py + half);
      }
      ctx.stroke();
    }

    for (const p of particles) {
      const frontier = progress * maxR * 1.1;
      const revealed = p.homeRadius <= frontier;

      let targetR: number;
      if (!revealed) {
        targetR = 0;
      } else {
        const overshoot = 1 + 0.03 * Math.sin(t * 2 + p.jitterPhase);
        targetR = p.homeRadius * overshoot;
      }

      const driftAngle = p.angularDrift * Math.sin(t * 0.4 + p.jitterPhase);
      const angle = p.homeAngle + driftAngle;

      const tx = cx + Math.cos(angle) * targetR;
      const ty = cy + Math.sin(angle) * targetR;

      p.vx += (tx - p.x) * 0.06;
      p.vy += (ty - p.y) * 0.06;
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.x += p.vx;
      p.y += p.vy;

      if (!revealed && Math.abs(p.x - cx) < 2 && Math.abs(p.y - cy) < 2) continue;

      const distFromCenter = Math.sqrt((p.y - cy) ** 2);
      let safeZoneFade = 1;
      if (distFromCenter < TEXT_SAFE_HALF) {
        const horizDist = Math.abs(p.x - cx);
        if (horizDist < w * 0.28) {
          safeZoneFade = Math.max(0, distFromCenter / TEXT_SAFE_HALF);
          safeZoneFade = safeZoneFade * safeZoneFade;
        }
      }

      const breatheRate = 1.2 + (1 - p.normalizedR) * 0.8;
      const pulse = 0.65 + 0.35 * Math.sin(t * breatheRate + p.jitterPhase);
      const fadeIn = revealed ? Math.min(1, (frontier - p.homeRadius) / (maxR * 0.15)) : 0;
      const alpha = p.baseAlpha * pulse * safeZoneFade * fadeIn;

      if (alpha < 0.01) continue;

      const col = p.isGold ? GOLD : DAWN;
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
      ctx.fillRect(snap(p.x), snap(p.y), p.size, p.size);
    }

    animRef.current = requestAnimationFrame(animate);
  }, [createdAtMs, expectedSeconds]);

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
