"use client";

import { useRef, useEffect, useCallback } from "react";

const GRID = 3;
const GOLD = { r: 202, g: 165, b: 84 };
const DAWN = { r: 236, g: 227, b: 214 };
const TEXT_SAFE_HALF = 18;
const TRACE_STEP = GRID;

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

type Point = {
  x: number;
  y: number;
};

type TraceTone = "gold" | "dawn";

type Trace = {
  points: Point[];
  delay: number;
  tone: TraceTone;
  pulsePhase: number;
  length: number;
};

type Node = {
  point: Point;
  delay: number;
  tone: TraceTone;
  pulsePhase: number;
  size: number;
};

type CircuitScene = {
  traces: Trace[];
  nodes: Node[];
  safeHalfX: number;
  safeHalfY: number;
};

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

function makeTrace(points: Point[], delay: number, tone: TraceTone, pulsePhase: number): Trace {
  return {
    points,
    delay,
    tone,
    pulsePhase,
    length: polylineLength(points),
  };
}

function inSafeZone(x: number, y: number, cx: number, cy: number, safeHalfX: number, safeHalfY: number): boolean {
  return Math.abs(x - cx) < safeHalfX && Math.abs(y - cy) < safeHalfY;
}

function pointAtDistance(trace: Trace, distance: number): Point {
  let remaining = clamp(distance, 0, trace.length);
  for (let i = 0; i < trace.points.length - 1; i++) {
    const start = trace.points[i];
    const end = trace.points[i + 1];
    const segLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (remaining <= segLength || i === trace.points.length - 2) {
      const ratio = segLength === 0 ? 0 : remaining / segLength;
      return {
        x: snap(start.x + (end.x - start.x) * ratio),
        y: snap(start.y + (end.y - start.y) * ratio),
      };
    }
    remaining -= segLength;
  }
  return trace.points[trace.points.length - 1];
}

function createCircuitScene(w: number, h: number, seed: number): CircuitScene {
  const cx = w / 2;
  const cy = h / 2;
  const rand = seededRandom(seed);
  const pad = snap(Math.max(18, Math.min(w, h) * 0.08));
  const safeHalfY = snap(Math.max(TEXT_SAFE_HALF + 2, Math.min(28, h * 0.11)));
  const safeHalfX = snap(Math.min(Math.max(96, w * 0.22), 168));
  const upperHubY = snap(cy - safeHalfY - GRID * 6);
  const lowerHubY = snap(cy + safeHalfY + GRID * 6);
  const upperBusY = snap(Math.max(pad + GRID * 4, upperHubY - h * 0.16));
  const lowerBusY = snap(Math.min(h - pad - GRID * 4, lowerHubY + h * 0.16));
  const leftEdgeX = snap(pad);
  const rightEdgeX = snap(w - pad);
  const leftInnerX = snap(Math.max(leftEdgeX + GRID * 8, cx - safeHalfX - w * 0.14));
  const rightInnerX = snap(Math.min(rightEdgeX - GRID * 8, cx + safeHalfX + w * 0.14));
  const upperInnerY = snap((upperHubY + upperBusY) / 2);
  const lowerInnerY = snap((lowerHubY + lowerBusY) / 2);
  const topCapY = snap(pad);
  const bottomCapY = snap(h - pad);
  const branchRatiosTop = [0.18, 0.34, 0.66, 0.82];
  const branchRatiosBottom = [0.22, 0.38, 0.62, 0.78];
  const span = rightEdgeX - leftEdgeX;
  const topBranchXs = branchRatiosTop.map((ratio) =>
    snap(clamp(leftEdgeX + span * ratio + (rand() - 0.5) * GRID * 8, leftEdgeX + GRID * 10, rightEdgeX - GRID * 10)),
  );
  const bottomBranchXs = branchRatiosBottom.map((ratio) =>
    snap(clamp(leftEdgeX + span * ratio + (rand() - 0.5) * GRID * 8, leftEdgeX + GRID * 10, rightEdgeX - GRID * 10)),
  );

  const traces: Trace[] = [
    makeTrace([{ x: snap(cx), y: upperHubY }, { x: snap(cx), y: upperBusY }], 0.02, "gold", 0.1),
    makeTrace([{ x: snap(cx), y: lowerHubY }, { x: snap(cx), y: lowerBusY }], 0.05, "gold", 0.6),
    makeTrace([{ x: leftInnerX, y: upperHubY }, { x: rightInnerX, y: upperHubY }], 0.07, "gold", 1.1),
    makeTrace([{ x: leftInnerX, y: lowerHubY }, { x: rightInnerX, y: lowerHubY }], 0.1, "gold", 1.5),
    makeTrace([{ x: leftInnerX, y: upperInnerY }, { x: rightInnerX, y: upperInnerY }], 0.14, "dawn", 2.0),
    makeTrace([{ x: leftInnerX, y: lowerInnerY }, { x: rightInnerX, y: lowerInnerY }], 0.17, "dawn", 2.4),
    makeTrace([{ x: leftInnerX, y: upperHubY }, { x: leftInnerX, y: upperBusY }], 0.2, "gold", 0.9),
    makeTrace([{ x: rightInnerX, y: upperHubY }, { x: rightInnerX, y: upperBusY }], 0.22, "gold", 1.3),
    makeTrace([{ x: leftInnerX, y: lowerHubY }, { x: leftInnerX, y: lowerBusY }], 0.24, "gold", 1.7),
    makeTrace([{ x: rightInnerX, y: lowerHubY }, { x: rightInnerX, y: lowerBusY }], 0.26, "gold", 2.1),
    makeTrace([{ x: leftEdgeX, y: upperBusY }, { x: rightEdgeX, y: upperBusY }], 0.3, "dawn", 2.7),
    makeTrace([{ x: leftEdgeX, y: lowerBusY }, { x: rightEdgeX, y: lowerBusY }], 0.33, "dawn", 3.0),
    makeTrace([{ x: leftEdgeX, y: upperBusY }, { x: leftEdgeX, y: lowerBusY }], 0.38, "dawn", 3.4),
    makeTrace([{ x: rightEdgeX, y: upperBusY }, { x: rightEdgeX, y: lowerBusY }], 0.42, "dawn", 3.8),
    makeTrace([{ x: leftInnerX, y: topCapY }, { x: rightInnerX, y: topCapY }], 0.66, "dawn", 4.1),
    makeTrace([{ x: leftInnerX, y: bottomCapY }, { x: rightInnerX, y: bottomCapY }], 0.7, "dawn", 4.4),
  ];

  topBranchXs.forEach((x, index) => {
    traces.push(
      makeTrace([{ x, y: upperBusY }, { x, y: topCapY }], 0.48 + index * 0.05, index % 2 === 0 ? "gold" : "dawn", 4.8 + index * 0.4),
    );
  });

  bottomBranchXs.forEach((x, index) => {
    traces.push(
      makeTrace([{ x, y: lowerBusY }, { x, y: bottomCapY }], 0.52 + index * 0.05, index % 2 === 1 ? "gold" : "dawn", 5.5 + index * 0.4),
    );
  });

  const nodeMap = new Map<string, Node>();
  const maxR = Math.hypot(cx, cy);

  for (const trace of traces) {
    for (const point of trace.points) {
      const key = `${point.x}:${point.y}`;
      const dist = Math.hypot(point.x - cx, point.y - cy);
      const delay = clamp(trace.delay + (dist / maxR) * 0.18, trace.delay, 0.95);
      const existing = nodeMap.get(key);
      if (existing) {
        existing.delay = Math.min(existing.delay, delay);
        if (trace.tone === "gold") {
          existing.tone = "gold";
          existing.size = GRID;
        }
        continue;
      }
      nodeMap.set(key, {
        point,
        delay,
        tone: trace.tone,
        pulsePhase: trace.pulsePhase,
        size: trace.tone === "gold" ? GRID : GRID - 1,
      });
    }
  }

  return {
    traces,
    nodes: Array.from(nodeMap.values()),
    safeHalfX,
    safeHalfY,
  };
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  trace: Trace,
  visibleLength: number,
  safeHalfX: number,
  safeHalfY: number,
  cx: number,
  cy: number,
  t: number,
) {
  const rgb = trace.tone === "gold" ? GOLD : DAWN;
  const pulse = 0.6 + 0.4 * Math.sin(t * 1.35 + trace.pulsePhase);
  const alpha = (trace.tone === "gold" ? 0.2 : 0.1) + (trace.tone === "gold" ? 0.25 : 0.14) * pulse;
  const size = trace.tone === "gold" ? GRID : GRID - 1;
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

  let drawn = 0;
  for (let i = 0; i < trace.points.length - 1; i++) {
    if (drawn >= visibleLength) break;
    const start = trace.points[i];
    const end = trace.points[i + 1];
    const segLength = Math.hypot(end.x - start.x, end.y - start.y);
    const segVisible = clamp(visibleLength - drawn, 0, segLength);

    for (let step = 0; step <= segVisible; step += TRACE_STEP) {
      const ratio = segLength === 0 ? 0 : step / segLength;
      const x = snap(start.x + (end.x - start.x) * ratio);
      const y = snap(start.y + (end.y - start.y) * ratio);
      if (inSafeZone(x, y, cx, cy, safeHalfX, safeHalfY)) continue;
      ctx.fillRect(x, y, size, size);
    }

    drawn += segLength;
  }
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  growth: number,
  safeHalfX: number,
  safeHalfY: number,
  cx: number,
  cy: number,
  t: number,
) {
  if (growth < node.delay) return;
  if (inSafeZone(node.point.x, node.point.y, cx, cy, safeHalfX, safeHalfY)) return;

  const rgb = node.tone === "gold" ? GOLD : DAWN;
  const pulse = 0.65 + 0.35 * Math.sin(t * 2 + node.pulsePhase);
  const alpha = (node.tone === "gold" ? 0.38 : 0.22) + (node.tone === "gold" ? 0.32 : 0.18) * pulse;
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  ctx.fillRect(node.point.x, node.point.y, node.size, node.size);
}

function drawActiveTip(
  ctx: CanvasRenderingContext2D,
  trace: Trace,
  localProgress: number,
  safeHalfX: number,
  safeHalfY: number,
  cx: number,
  cy: number,
  t: number,
) {
  if (localProgress <= 0 || localProgress >= 1) return;
  const tip = pointAtDistance(trace, trace.length * localProgress);
  if (inSafeZone(tip.x, tip.y, cx, cy, safeHalfX, safeHalfY)) return;

  const rgb = trace.tone === "gold" ? GOLD : DAWN;
  const pulse = 0.72 + 0.28 * Math.sin(t * 5 + trace.pulsePhase);
  const alpha = 0.55 + 0.35 * pulse;
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  ctx.fillRect(tip.x - 1, tip.y - 1, GRID + 1, GRID + 1);
  ctx.fillRect(tip.x - GRID, tip.y, GRID - 1, GRID - 1);
  ctx.fillRect(tip.x + GRID - 1, tip.y, GRID - 1, GRID - 1);
  ctx.fillRect(tip.x, tip.y - GRID, GRID - 1, GRID - 1);
  ctx.fillRect(tip.x, tip.y + GRID - 1, GRID - 1, GRID - 1);
}

function drawSafeZoneBrackets(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  safeHalfX: number,
  safeHalfY: number,
  growth: number,
) {
  const arm = snap(10 + growth * 12);
  const alpha = 0.08 + growth * 0.08;
  const left = snap(cx - safeHalfX);
  const right = snap(cx + safeHalfX);
  const top = snap(cy - safeHalfY);
  const bottom = snap(cy + safeHalfY);

  ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(left, top + arm);
  ctx.lineTo(left, top);
  ctx.lineTo(left + arm, top);

  ctx.moveTo(right - arm, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + arm);

  ctx.moveTo(left, bottom - arm);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + arm, bottom);

  ctx.moveTo(right - arm, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - arm);
  ctx.stroke();
}

type SigilLoadingFieldProps = {
  seed?: string;
  createdAt?: string;
  modelId?: string;
};

export function SigilLoadingField({ seed, createdAt, modelId }: SigilLoadingFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CircuitScene | null>(null);
  const animRef = useRef<number>(0);
  const dimsRef = useRef({ w: 0, h: 0 });
  const startRef = useRef<number>(Date.now());

  const seedNum = seed ? seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) : 42;
  const createdAtMs = createdAt ? new Date(createdAt).getTime() : startRef.current;
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
    sceneRef.current = createCircuitScene(w, h, seedNum);
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

    const scene = sceneRef.current;
    if (!scene) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }
    const now = Date.now();
    const elapsed = Math.max(0, (now - createdAtMs) / 1000);
    const raw = elapsed / expectedSeconds;
    const progress = 1 - 1 / (1 + raw * 1.8);
    const growth = 1 - Math.pow(1 - progress, 1.45);
    const t = elapsed;

    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const crossSize = 14 + growth * 10;
    const crossAlpha = 0.04 + growth * 0.05;
    ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${crossAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    drawSafeZoneBrackets(ctx, cx, cy, scene.safeHalfX, scene.safeHalfY, growth);

    for (const trace of scene.traces) {
      const localProgress = clamp((growth - trace.delay) / (1 - trace.delay), 0, 1);
      if (localProgress <= 0) continue;
      const visibleLength = trace.length * localProgress;
      drawTrace(ctx, trace, visibleLength, scene.safeHalfX, scene.safeHalfY, cx, cy, t);
      drawActiveTip(ctx, trace, localProgress, scene.safeHalfX, scene.safeHalfY, cx, cy, t);
    }

    for (const node of scene.nodes) {
      drawNode(ctx, node, growth, scene.safeHalfX, scene.safeHalfY, cx, cy, t);
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
