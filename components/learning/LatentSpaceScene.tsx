"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { ParticleSceneBlock } from "@/lib/learning/types";
import styles from "@/app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css";

const GRID = 3;
const GOLD = { h: 43, s: 55, l: 54 };
const CLUSTER_COLORS = [
  { h: 43, s: 55, l: 54 },   // gold — "visual art"
  { h: 200, s: 45, l: 55 },  // blue — "photography"
  { h: 15, s: 60, l: 50 },   // amber — "illustration"
  { h: 150, s: 40, l: 45 },  // teal — "architecture"
];

const CLUSTER_LABELS = ["visual art", "photography", "illustration", "architecture"];

type Particle = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  cluster: number;
  alpha: number;
  size: number;
};

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function createParticles(
  w: number,
  h: number,
  count: number,
  clusterCount: number,
): Particle[] {
  const particles: Particle[] = [];
  const centerX = w / 2;
  const centerY = h / 2;
  const spread = Math.min(w, h) * 0.35;

  for (let i = 0; i < count; i++) {
    const cluster = i % clusterCount;
    const angle = (cluster / clusterCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const dist = spread * 0.3 + Math.random() * spread * 0.5;
    const homeX = snap(centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40);
    const homeY = snap(centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40);

    particles.push({
      x: homeX,
      y: homeY,
      homeX,
      homeY,
      vx: 0,
      vy: 0,
      cluster,
      alpha: 0.3 + Math.random() * 0.5,
      size: GRID - 1 + Math.floor(Math.random() * 2),
    });
  }
  return particles;
}

export function LatentSpaceScene({
  block,
}: {
  block: ParticleSceneBlock;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  const [specificity, setSpecificity] = useState(0.5);

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

    particlesRef.current = createParticles(w, h, 200, CLUSTER_COLORS.length);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;
    const particles = particlesRef.current;
    const mouse = mouseRef.current;
    const clusterTightness = specificity;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    for (const p of particles) {
      const clusterAngle = (p.cluster / CLUSTER_COLORS.length) * Math.PI * 2;
      const spread = Math.min(w, h) * 0.35;
      const clusterDist = spread * (0.15 + (1 - clusterTightness) * 0.55);

      const targetX = snap(
        centerX +
          Math.cos(clusterAngle) * clusterDist * (1 + clusterTightness * 0.5) +
          (p.homeX - centerX) * (1 - clusterTightness * 0.6),
      );
      const targetY = snap(
        centerY +
          Math.sin(clusterAngle) * clusterDist * (1 + clusterTightness * 0.5) +
          (p.homeY - centerY) * (1 - clusterTightness * 0.6),
      );

      const dx = targetX - p.x;
      const dy = targetY - p.y;
      p.vx += dx * 0.02;
      p.vy += dy * 0.02;

      if (mouse.active) {
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 80) {
          const force = (80 - mdist) / 80;
          p.vx += (mdx / mdist) * force * 2;
          p.vy += (mdy / mdist) * force * 2;
        }
      }

      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx;
      p.y += p.vy;

      const col = CLUSTER_COLORS[p.cluster];
      ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, ${p.alpha * 0.7})`;
      ctx.fillRect(snap(p.x), snap(p.y), p.size, p.size);
    }

    // Cluster labels
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    for (let c = 0; c < CLUSTER_COLORS.length; c++) {
      const angle = (c / CLUSTER_COLORS.length) * Math.PI * 2;
      const labelDist = Math.min(w, h) * 0.42;
      const lx = centerX + Math.cos(angle) * labelDist;
      const ly = centerY + Math.sin(angle) * labelDist;
      const col = CLUSTER_COLORS[c];
      ctx.fillStyle = `hsla(${col.h}, ${col.s}%, ${col.l}%, 0.5)`;
      ctx.fillText(CLUSTER_LABELS[c].toUpperCase(), lx, ly);
    }

    // Center crosshair
    ctx.strokeStyle = `hsla(${GOLD.h}, ${GOLD.s}%, ${GOLD.l}%, 0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY);
    ctx.lineTo(centerX + 12, centerY);
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX, centerY + 12);
    ctx.stroke();

    animRef.current = requestAnimationFrame(animate);
  }, [specificity]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { ...mouseRef.current, active: false };
  }, []);

  return (
    <div className={styles.particleScene}>
      <div className={styles.particleSceneTitle}>{block.title}</div>
      <div className={styles.particleSceneDesc}>{block.description}</div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          cursor: "crosshair",
        }}
      />

      {/* Interactive slider */}
      <div
        style={{
          position: "absolute",
          bottom: "var(--space-lg)",
          left: "var(--space-lg)",
          right: "var(--space-lg)",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
            whiteSpace: "nowrap",
          }}
        >
          Vague
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={specificity}
          onChange={(e) => setSpecificity(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: "var(--gold)",
            height: "2px",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
            whiteSpace: "nowrap",
          }}
        >
          Specific
        </span>
      </div>
    </div>
  );
}
