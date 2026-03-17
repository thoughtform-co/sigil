"use client";

import { useEffect, useRef } from "react";

type SemanticBridgeMapProps = {
  leftLabel: string;
  rightLabel: string;
  accentColor?: string;
  darkColor?: string;
  connected?: boolean;
};

export function SemanticBridgeMap({
  leftLabel,
  rightLabel,
  accentColor = "#FE6744",
  darkColor = "#241D1B",
  connected = false,
}: SemanticBridgeMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (!connected) {
      tRef.current = 0;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const path = pathRef.current;
      if (path) {
        path.style.strokeDashoffset = `${path.getTotalLength?.() ?? 200}`;
        path.style.opacity = "0";
      }
      return;
    }

    const path = pathRef.current;
    if (!path) return;
    const totalLen = path.getTotalLength?.() ?? 200;
    path.style.strokeDasharray = `${totalLen}`;
    path.style.strokeDashoffset = `${totalLen}`;
    path.style.opacity = "0.7";

    const startTime = performance.now();
    const drawDuration = 1200;

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / drawDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (path) {
        path.style.strokeDashoffset = `${totalLen * (1 - eased)}`;
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        tRef.current = 0;
        function flow() {
          tRef.current += 0.003;
          if (path) {
            path.style.strokeDasharray = `8 6`;
            path.style.strokeDashoffset = `${-tRef.current * 60}`;
          }
          animRef.current = requestAnimationFrame(flow);
        }
        animRef.current = requestAnimationFrame(flow);
      }
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [connected]);

  const lx = 18;
  const rx = 82;
  const ly = 58;
  const ry = 42;

  const routeD = `M ${lx} ${ly} C ${lx + 14} ${ly - 16}, ${rx - 22} ${ry + 20}, 50 ${(ly + ry) / 2} C ${rx - 14} ${ry - 8}, ${rx - 6} ${ry + 4}, ${rx} ${ry}`;

  function contourRing(cx: number, cy: number, rx: number, ry: number, rotation: number, opacity: number) {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={accentColor}
        strokeWidth={0.35}
        strokeOpacity={opacity}
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: 180,
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      >
        {/* Isometric grid */}
        <g stroke={darkColor} strokeOpacity={0.05} strokeWidth={0.12}>
          {Array.from({ length: 21 }, (_, i) => {
            const x = i * 5;
            return <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={100} />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = 20 + i * 6;
            return <line key={`h-${i}`} x1={0} y1={y} x2={100} y2={y - 12} />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = 20 + i * 6;
            return <line key={`d-${i}`} x1={0} y1={y} x2={100} y2={y + 12} />;
          })}
        </g>

        {/* Left waypoint contours */}
        {contourRing(lx, ly, 6, 3.8, -8, 0.14)}
        {contourRing(lx, ly, 9.5, 6, -8, 0.10)}
        {contourRing(lx, ly, 13, 8.2, -8, 0.07)}
        {contourRing(lx, ly, 17, 10.5, -8, 0.04)}

        {/* Right waypoint contours */}
        {contourRing(rx, ry, 5.5, 3.5, 12, 0.14)}
        {contourRing(rx, ry, 8.5, 5.5, 12, 0.10)}
        {contourRing(rx, ry, 12, 7.5, 12, 0.07)}
        {contourRing(rx, ry, 16, 9.8, 12, 0.04)}

        {/* Bridge route -- hidden until connected */}
        <path
          ref={pathRef}
          d={routeD}
          fill="none"
          stroke={accentColor}
          strokeWidth={0.8}
          strokeLinecap="round"
          style={{
            opacity: 0,
            transition: "none",
          }}
        />

        {/* Left waypoint diamond + crosshair */}
        <g transform={`translate(${lx} ${ly})`}>
          <line x1={-5} y1={0} x2={5} y2={0} stroke={darkColor} strokeWidth={0.2} strokeOpacity={0.18} />
          <line x1={0} y1={-5} x2={0} y2={5} stroke={darkColor} strokeWidth={0.2} strokeOpacity={0.18} />
          <rect x={-1.8} y={-1.8} width={3.6} height={3.6} transform="rotate(45)" fill={accentColor} fillOpacity={0.85} />
          <rect x={-0.8} y={-0.8} width={1.6} height={1.6} transform="rotate(45)" fill={darkColor} fillOpacity={0.12} />
        </g>

        {/* Right waypoint diamond + crosshair */}
        <g transform={`translate(${rx} ${ry})`}>
          <line x1={-5} y1={0} x2={5} y2={0} stroke={darkColor} strokeWidth={0.2} strokeOpacity={0.18} />
          <line x1={0} y1={-5} x2={0} y2={5} stroke={darkColor} strokeWidth={0.2} strokeOpacity={0.18} />
          <rect x={-1.8} y={-1.8} width={3.6} height={3.6} transform="rotate(45)" fill={connected ? accentColor : darkColor} fillOpacity={connected ? 0.85 : 0.25} style={{ transition: "fill 400ms, fill-opacity 400ms" }} />
          <rect x={-0.8} y={-0.8} width={1.6} height={1.6} transform="rotate(45)" fill={darkColor} fillOpacity={0.12} />
        </g>
      </svg>

      {/* Labels */}
      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "68%",
          fontFamily: "var(--ws-mono, var(--font-mono))",
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: darkColor,
          opacity: 0.45,
          maxWidth: 120,
          lineHeight: 1.3,
        }}
      >
        {leftLabel}
      </div>
      <div
        style={{
          position: "absolute",
          right: "6%",
          top: "22%",
          fontFamily: "var(--ws-mono, var(--font-mono))",
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: accentColor,
          opacity: connected ? 0.8 : 0.35,
          transition: "opacity 400ms",
          maxWidth: 120,
          lineHeight: 1.3,
          textAlign: "right",
        }}
      >
        {rightLabel}
      </div>
    </div>
  );
}
