"use client";

import { useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const GRID = 3;
const GOLD = { h: 43, s: 55, l: 54 };
const PARTICLE_COUNT = 280;
const SPHERE_RADIUS = 120;
const BREATHING_AMP = 8;
const BREATHING_SPEED = 0.4;
const ROTATION_SPEED = 0.15;

type Particle = {
  theta: number;
  phi: number;
  r: number;
  alpha: number;
};

function generateSphere(): Particle[] {
  const pts: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.85 + Math.random() * 0.15;
    const alpha = 0.3 + Math.random() * 0.5;
    pts.push({ theta, phi, r, alpha });
  }
  return pts;
}

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

const READOUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--dawn-30)",
  lineHeight: 1.8,
};

type HomeLandingProps = {
  isAdmin?: boolean;
};

export function HomeLanding({ isAdmin }: HomeLandingProps) {
  const { isAdmin: authIsAdmin } = useAuth();
  const admin = isAdmin ?? authIsAdmin;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(generateSphere());
  const animRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const t = performance.now() / 1000;
    const breathing = Math.sin(t * BREATHING_SPEED * Math.PI * 2) * BREATHING_AMP;
    const rotation = t * ROTATION_SPEED;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseR = SPHERE_RADIUS + breathing;

    const particles = particlesRef.current;
    for (const p of particles) {
      const theta = p.theta + rotation;
      const phi = p.phi;
      const r = baseR * p.r;

      const x3d = r * Math.sin(phi) * Math.cos(theta);
      const y3d = r * Math.cos(phi);
      const z3d = r * Math.sin(phi) * Math.sin(theta);

      const depth = (z3d + baseR) / (2 * baseR);
      const depthAlpha = 0.15 + depth * 0.85;

      const sx = snap(cx + x3d);
      const sy = snap(cy + y3d);

      const lightness = GOLD.l + (1 - depth) * 8;
      const alpha = p.alpha * depthAlpha;

      ctx.fillStyle = `hsla(${GOLD.h}, ${GOLD.s}%, ${lightness}%, ${alpha})`;
      ctx.fillRect(sx, sy, GRID - 1, GRID - 1);
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        minHeight: "calc(100vh - 200px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          ...READOUT_STYLE,
        }}
      >
        <span>SIGIL</span>
        <span style={{ color: "var(--dawn-15)" }}>v0.1</span>
        {admin && (
          <>
            <span style={{ marginTop: 16 }}>STATUS</span>
            <span style={{ color: "var(--gold)" }}>ONLINE</span>
          </>
        )}
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: 400,
          height: 400,
          imageRendering: "pixelated",
        }}
        aria-hidden="true"
      />

      <div
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          textAlign: "right",
          ...READOUT_STYLE,
        }}
      >
        <span>THOUGHTFORM</span>
        <span style={{ color: "var(--dawn-15)" }}>NAVIGATE INTELLIGENCE</span>
        {admin && (
          <>
            <span style={{ marginTop: 16 }}>MODE</span>
            <span style={{ color: "var(--gold)" }}>ADMIN</span>
          </>
        )}
      </div>
    </div>
  );
}
