"use client";

import { useRef, useEffect, useCallback } from "react";

const GRID = 3;
const GOLD = { r: 202, g: 165, b: 84 };
const DAWN = { r: 236, g: 227, b: 214 };
const TEXT_SAFE_HALF = 18;
const MAX_DEPTH = 5;
const INITIAL_STEMS = 6;
const STEP_LENGTH = GRID * 3;

const ACTIVE_FRAME_MS = 1000 / 24;
const SETTLED_FRAME_MS = 1000 / 12;
const SETTLED_GROWTH = 0.97;

const ALPHA_STEPS = 20;
function buildPalette(rgb: { r: number; g: number; b: number }): string[] {
  return Array.from({ length: ALPHA_STEPS + 1 }, (_, i) =>
    `rgba(${rgb.r},${rgb.g},${rgb.b},${(i / ALPHA_STEPS).toFixed(2)})`,
  );
}
const GOLD_PALETTE = buildPalette(GOLD);
const DAWN_PALETTE = buildPalette(DAWN);

function paletteIdx(alpha: number): number {
  return Math.round(Math.max(0, Math.min(1, alpha)) * ALPHA_STEPS);
}

function pushBatch(
  batches: Map<string, number[]>,
  color: string,
  x: number, y: number, w: number, h: number,
): void {
  let arr = batches.get(color);
  if (!arr) { arr = []; batches.set(color, arr); }
  arr.push(x, y, w, h);
}

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

type Point = { x: number; y: number };
type TraceTone = "gold" | "dawn";

type TrailDot = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  tone: TraceTone;
  driftX: number;
  driftY: number;
  driftAlpha: number;
  distFromCenter: number;
  pulsePhase: number;
};

type JunctionNode = {
  x: number;
  y: number;
  tone: TraceTone;
  delay: number;
  pulsePhase: number;
};

type Branch = {
  dots: TrailDot[];
  delay: number;
  depth: number;
  dotSpacing: number;
};

type MycelialScene = {
  branches: Branch[];
  junctions: JunctionNode[];
  safeHalfX: number;
  safeHalfY: number;
  maxDist: number;
};

function inSafeZone(x: number, y: number, cx: number, cy: number, safeHalfX: number, safeHalfY: number): boolean {
  return Math.abs(x - cx) < safeHalfX && Math.abs(y - cy) < safeHalfY;
}

function growBranch(
  cx: number,
  cy: number,
  startX: number,
  startY: number,
  angle: number,
  depth: number,
  delay: number,
  maxRadius: number,
  rand: () => number,
  branches: Branch[],
  junctions: JunctionNode[],
  safeHalfX: number,
  safeHalfY: number,
): void {
  if (depth > MAX_DEPTH) return;

  const dots: TrailDot[] = [];
  const stepsBeforeFork = 4 + Math.floor(rand() * 6);
  const dotSpacing = GRID * (2 + depth);
  const tone: TraceTone = depth <= 1 ? "gold" : rand() < 0.3 ? "gold" : "dawn";
  const wobbleStrength = 0.15 + depth * 0.08;
  const pulseBase = rand() * Math.PI * 4;

  let px = startX;
  let py = startY;
  let currentAngle = angle;
  let stepCount = 0;
  let totalDist = 0;

  while (totalDist < maxRadius * (0.85 - depth * 0.08)) {
    currentAngle += (rand() - 0.5) * wobbleStrength;
    px += Math.cos(currentAngle) * STEP_LENGTH;
    py += Math.sin(currentAngle) * STEP_LENGTH;
    totalDist += STEP_LENGTH;
    stepCount++;

    const sx = snap(px);
    const sy = snap(py);
    const dist = Math.hypot(sx - cx, sy - cy);

    if (sx < GRID || sy < GRID) break;

    const isDrift = rand() < 0.1;
    const perpAngle = currentAngle + Math.PI / 2;
    const driftX = isDrift ? snap(Math.cos(perpAngle) * GRID) : 0;
    const driftY = isDrift ? snap(Math.sin(perpAngle) * GRID) : 0;

    dots.push({
      x: sx,
      y: sy,
      size: depth <= 1 ? GRID : GRID - 1,
      alpha: clamp(0.55 - depth * 0.08, 0.15, 0.6),
      tone,
      driftX,
      driftY,
      driftAlpha: isDrift ? 0.25 + rand() * 0.2 : 0,
      distFromCenter: dist,
      pulsePhase: pulseBase + totalDist * 0.02,
    });

    if (stepCount === stepsBeforeFork && depth < MAX_DEPTH) {
      junctions.push({
        x: sx,
        y: sy,
        tone,
        delay: delay + (dist / maxRadius) * 0.5,
        pulsePhase: pulseBase + totalDist * 0.03,
      });

      const forkCount = rand() < 0.4 ? 2 : 1;
      for (let f = 0; f < forkCount; f++) {
        const forkAngle = currentAngle + (rand() - 0.5) * 1.2 + (f === 1 ? 0.6 : -0.3);
        const childDelay = delay + (dist / maxRadius) * 0.5;
        growBranch(cx, cy, sx, sy, forkAngle, depth + 1, childDelay, maxRadius, rand, branches, junctions, safeHalfX, safeHalfY);
      }
    }

    if (stepCount > stepsBeforeFork + 3 + Math.floor(rand() * 4) && depth < MAX_DEPTH - 1 && rand() < 0.35) {
      junctions.push({
        x: sx,
        y: sy,
        tone,
        delay: delay + (dist / maxRadius) * 0.5,
        pulsePhase: pulseBase + totalDist * 0.03,
      });

      const lateralAngle = currentAngle + (rand() < 0.5 ? 0.7 : -0.7) + (rand() - 0.5) * 0.3;
      growBranch(cx, cy, sx, sy, lateralAngle, depth + 1, delay + (dist / maxRadius) * 0.5, maxRadius, rand, branches, junctions, safeHalfX, safeHalfY);
    }
  }

  if (dots.length > 0) {
    branches.push({ dots, delay, depth, dotSpacing });
  }
}

function createMycelialScene(w: number, h: number, seed: number): MycelialScene {
  const cx = w / 2;
  const cy = h / 2;
  const maxRadius = Math.hypot(cx, cy);
  const rand = seededRandom(seed);
  const safeHalfY = snap(Math.max(TEXT_SAFE_HALF + 2, Math.min(28, h * 0.11)));
  const safeHalfX = snap(Math.min(Math.max(96, w * 0.22), 168));

  const branches: Branch[] = [];
  const junctions: JunctionNode[] = [];

  junctions.push({
    x: snap(cx),
    y: snap(cy),
    tone: "gold",
    delay: 0,
    pulsePhase: 0,
  });

  for (let i = 0; i < INITIAL_STEMS; i++) {
    const angle = (i / INITIAL_STEMS) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const delay = 0.02 + rand() * 0.08;
    growBranch(cx, cy, snap(cx), snap(cy), angle, 0, delay, maxRadius, rand, branches, junctions, safeHalfX, safeHalfY);
  }

  return { branches, junctions, safeHalfX, safeHalfY, maxDist: maxRadius };
}

type SigilLoadingFieldProps = {
  seed?: string;
  createdAt?: string;
  modelId?: string;
};

export function SigilLoadingField({ seed, createdAt, modelId }: SigilLoadingFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sceneRef = useRef<MycelialScene | null>(null);
  const animRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const dimsRef = useRef({ w: 0, h: 0 });
  const startRef = useRef<number>(Date.now());
  const lastFrameRef = useRef<number>(0);
  const batchRef = useRef(new Map<string, number[]>());

  const seedNum = seed ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 42;
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : startRef.current;
  const expectedSeconds = estimateGenerationSeconds(modelId ?? "");

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w;
    canvas.height = h;
    dimsRef.current = { w, h };
    sceneRef.current = createMycelialScene(w, h, seedNum);
  }, [seedNum]);

  const animate = useCallback(() => {
    if (!visibleRef.current) {
      animRef.current = 0;
      return;
    }

    const ctx = ctxRef.current;
    const { w, h } = dimsRef.current;
    const scene = sceneRef.current;

    if (!ctx || w === 0 || h === 0 || !scene) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }

    const elapsed = Math.max(0, (Date.now() - createdAtMs) / 1000);
    const raw = elapsed / expectedSeconds;
    const progress = 1 - 1 / (1 + raw * 1.8);
    const growth = 1 - Math.pow(1 - progress, 1.45);

    const frameMs = growth > SETTLED_GROWTH ? SETTLED_FRAME_MS : ACTIVE_FRAME_MS;
    const now = performance.now();
    if (now - lastFrameRef.current < frameMs) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameRef.current = now;

    const t = elapsed;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const crossSize = 14 + growth * 10;
    ctx.strokeStyle = GOLD_PALETTE[paletteIdx(0.04 + growth * 0.05)];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    const arm = snap(10 + growth * 12);
    const left = snap(cx - scene.safeHalfX);
    const right = snap(cx + scene.safeHalfX);
    const top = snap(cy - scene.safeHalfY);
    const bottom = snap(cy + scene.safeHalfY);

    ctx.strokeStyle = GOLD_PALETTE[paletteIdx(0.08 + growth * 0.08)];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top + arm); ctx.lineTo(left, top); ctx.lineTo(left + arm, top);
    ctx.moveTo(right - arm, top); ctx.lineTo(right, top); ctx.lineTo(right, top + arm);
    ctx.moveTo(left, bottom - arm); ctx.lineTo(left, bottom); ctx.lineTo(left + arm, bottom);
    ctx.moveTo(right - arm, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - arm);
    ctx.stroke();

    const batches = batchRef.current;
    for (const arr of batches.values()) arr.length = 0;

    for (const branch of scene.branches) {
      const branchGrowth = clamp((growth - branch.delay) / Math.max(0.01, 1 - branch.delay), 0, 1);
      if (branchGrowth <= 0) continue;

      const visibleCount = Math.ceil(branch.dots.length * branchGrowth);
      let lastVisible: Point | null = null;
      const spacing = Math.max(1, Math.round(branch.dotSpacing / GRID));

      for (let i = 0; i < visibleCount; i++) {
        if (i % spacing !== 0 && i !== visibleCount - 1) continue;
        const dot = branch.dots[i];

        let safeZoneFade = 1;
        if (inSafeZone(dot.x, dot.y, cx, cy, scene.safeHalfX, scene.safeHalfY)) {
          const horizDist = Math.abs(dot.x - cx);
          if (horizDist < scene.safeHalfX * 0.85) {
            safeZoneFade = Math.abs(dot.y - cy) / scene.safeHalfY;
            safeZoneFade *= safeZoneFade;
          }
        }
        if (safeZoneFade < 0.02) continue;

        const fadeIn = clamp((visibleCount - i) / Math.max(1, branch.dots.length * 0.1), 0, 1);
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.4 + dot.pulsePhase);
        const palette = dot.tone === "gold" ? GOLD_PALETTE : DAWN_PALETTE;
        const alpha = dot.alpha * pulse * safeZoneFade * fadeIn;

        if (alpha > 0.01) {
          pushBatch(batches, palette[paletteIdx(alpha)], dot.x, dot.y, dot.size, dot.size);
        }

        if (dot.driftAlpha > 0 && safeZoneFade > 0.1) {
          const dAlpha = dot.driftAlpha * pulse * safeZoneFade * fadeIn;
          if (dAlpha > 0.01) {
            pushBatch(batches, palette[paletteIdx(dAlpha)], dot.x + dot.driftX, dot.y + dot.driftY, GRID - 1, GRID - 1);
          }
        }

        lastVisible = dot;
      }

      if (lastVisible && branchGrowth > 0.05 && branchGrowth < 0.98) {
        if (!inSafeZone(lastVisible.x, lastVisible.y, cx, cy, scene.safeHalfX, scene.safeHalfY)) {
          const palette = branch.depth <= 1 ? GOLD_PALETTE : DAWN_PALETTE;
          const tipPulse = 0.7 + 0.3 * Math.sin(t * 4.5 + branch.delay * 10);
          const tipAlpha = 0.5 + 0.4 * tipPulse;
          pushBatch(batches, palette[paletteIdx(tipAlpha)], lastVisible.x - 1, lastVisible.y - 1, GRID + 1, GRID + 1);
          const dimColor = palette[paletteIdx(tipAlpha * 0.5)];
          pushBatch(batches, dimColor, lastVisible.x - GRID, lastVisible.y, GRID - 1, GRID - 1);
          pushBatch(batches, dimColor, lastVisible.x + GRID - 1, lastVisible.y, GRID - 1, GRID - 1);
          pushBatch(batches, dimColor, lastVisible.x, lastVisible.y - GRID, GRID - 1, GRID - 1);
          pushBatch(batches, dimColor, lastVisible.x, lastVisible.y + GRID - 1, GRID - 1, GRID - 1);
        }
      }
    }

    for (const node of scene.junctions) {
      const nodeGrowth = clamp((growth - node.delay) / Math.max(0.01, 1 - node.delay), 0, 1);
      if (nodeGrowth <= 0) continue;
      if (inSafeZone(node.x, node.y, cx, cy, scene.safeHalfX, scene.safeHalfY)) continue;

      const palette = node.tone === "gold" ? GOLD_PALETTE : DAWN_PALETTE;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + node.pulsePhase);
      const alpha = (node.tone === "gold" ? 0.55 : 0.35) * pulse * nodeGrowth;

      pushBatch(batches, palette[paletteIdx(alpha)], node.x, node.y, GRID, GRID);
      const armColor = palette[paletteIdx(alpha * 0.55)];
      pushBatch(batches, armColor, node.x - GRID, node.y, GRID - 1, GRID - 1);
      pushBatch(batches, armColor, node.x + GRID, node.y, GRID - 1, GRID - 1);
      pushBatch(batches, armColor, node.x, node.y - GRID, GRID - 1, GRID - 1);
      pushBatch(batches, armColor, node.x, node.y + GRID, GRID - 1, GRID - 1);
    }

    for (const [color, rects] of batches) {
      if (rects.length === 0) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < rects.length; i += 4) {
        ctx.rect(rects[i], rects[i + 1], rects[i + 2], rects[i + 3]);
      }
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(animate);
  }, [createdAtMs, expectedSeconds]);

  useEffect(() => {
    setup();
    animRef.current = requestAnimationFrame(animate);

    const onResize = () => setup();
    window.addEventListener("resize", onResize);

    const canvas = canvasRef.current;
    const observer = canvas
      ? new IntersectionObserver(
          ([entry]) => {
            const wasVisible = visibleRef.current;
            visibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting && !wasVisible && !animRef.current) {
              animRef.current = requestAnimationFrame(animate);
            }
          },
          { threshold: 0 },
        )
      : null;
    if (canvas && observer) observer.observe(canvas);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
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
