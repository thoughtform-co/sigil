"use client";

import { useEffect, useId, useRef } from "react";

type SemanticBridgeMapProps = {
  leftLabel: string;
  rightLabel: string;
  accentColor?: string;
  darkColor?: string;
  connected?: boolean;
  destPoint?: { x: number; y: number };
};

export function SemanticBridgeMap({
  leftLabel,
  rightLabel,
  accentColor = "#FE6744",
  darkColor = "#241D1B",
  connected = false,
  destPoint,
}: SemanticBridgeMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const clipId = useId();

  const leftPoint = { x: 22, y: 64 };
  const rightPoint = destPoint ?? { x: 80, y: 34 };
  const midPoint = {
    x: (leftPoint.x + rightPoint.x) / 2 + 1,
    y: (leftPoint.y + rightPoint.y) / 2 + 1,
  };

  const rpx = rightPoint.x;
  const rpy = rightPoint.y;

  useEffect(() => {
    if (!connected) {
      tRef.current = 0;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const path = pathRef.current;
      if (path) {
        const totalLen = path.getTotalLength?.() ?? 220;
        path.style.strokeDasharray = `${totalLen}`;
        path.style.strokeDashoffset = `${totalLen}`;
        path.style.opacity = "0";
      }
      return;
    }

    const path = pathRef.current;
    if (!path) return;
    const totalLen = path.getTotalLength?.() ?? 220;
    path.style.strokeDasharray = `${totalLen}`;
    path.style.strokeDashoffset = `${totalLen}`;
    path.style.opacity = "0.82";

    const startTime = performance.now();
    const drawDuration = 1250;

    const p = path;
    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / drawDuration);
      const eased = 1 - Math.pow(1 - t, 3);

      p.style.strokeDashoffset = `${totalLen * (1 - eased)}`;

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      tRef.current = 0;
      function flow() {
        tRef.current += 0.0036;
        p.style.strokeDasharray = "7 6";
        p.style.strokeDashoffset = `${-tRef.current * 76}`;
        animRef.current = requestAnimationFrame(flow);
      }
      animRef.current = requestAnimationFrame(flow);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [connected, rpx, rpy]);

  const planePath = "M 5 88 L 27 8 L 97 8 L 75 88 Z";
  const routeD = `M ${leftPoint.x} ${leftPoint.y} C ${leftPoint.x + 15} ${leftPoint.y - 20}, ${midPoint.x - 10} ${midPoint.y + 10}, ${midPoint.x} ${midPoint.y} C ${midPoint.x + 13} ${midPoint.y - 16}, ${rightPoint.x - 14} ${rightPoint.y + 10}, ${rightPoint.x} ${rightPoint.y}`;

  const dx = rightPoint.x - leftPoint.x;
  const dy = rightPoint.y - leftPoint.y;
  const auxRing1 = { x: leftPoint.x + dx * 0.293, y: leftPoint.y + dy * 0.2 };
  const auxRing2 = { x: leftPoint.x + dx * 0.759, y: leftPoint.y + dy * 0.7 };

  const rightCalloutEnd = {
    x: rightPoint.x * 0.863,
    y: rightPoint.y * 0.824,
  };
  const rightLabelLeft = `${rightPoint.x * 0.85}%`;
  const rightLabelTop = `${rightPoint.y * 0.706}%`;

  function contourRing(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    opacity: number,
    width = 0.35,
  ) {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={accentColor}
        strokeWidth={width}
        strokeOpacity={opacity}
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: 330,
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={planePath} />
          </clipPath>
        </defs>

        <path
          d={planePath}
          fill={darkColor}
          fillOpacity={0.034}
          stroke={darkColor}
          strokeOpacity={0.16}
          strokeWidth={0.28}
        />

        <g clipPath={`url(#${clipId})`} stroke={darkColor} strokeOpacity={0.12}>
          {Array.from({ length: 22 }, (_, i) => {
            const x = -20 + i * 6.8;
            return (
              <line
                key={`iso-a-${i}`}
                x1={x}
                y1={92}
                x2={x + 34}
                y2={3}
                strokeWidth={0.2}
              />
            );
          })}
          {Array.from({ length: 22 }, (_, i) => {
            const x = i * 6.8;
            return (
              <line
                key={`iso-b-${i}`}
                x1={x}
                y1={92}
                x2={x + 64}
                y2={3}
                strokeWidth={0.2}
              />
            );
          })}
          {Array.from({ length: 15 }, (_, i) => {
            const y = 14 + i * 5.2;
            return (
              <line
                key={`iso-c-${i}`}
                x1={4}
                y1={y}
                x2={98}
                y2={y}
                strokeWidth={0.16}
                strokeOpacity={0.07}
              />
            );
          })}
        </g>

        <g opacity={0.96}>
          {contourRing(leftPoint.x, leftPoint.y, 8.8, 5.3, -10, 0.22, 0.42)}
          {contourRing(leftPoint.x, leftPoint.y, 13.2, 7.9, -10, 0.15, 0.38)}
          {contourRing(leftPoint.x, leftPoint.y, 17.7, 10.7, -10, 0.1, 0.32)}
          {contourRing(leftPoint.x, leftPoint.y, 22.8, 13.7, -10, 0.06, 0.26)}

          {contourRing(rightPoint.x, rightPoint.y, 8.2, 5.0, 12, 0.22, 0.42)}
          {contourRing(rightPoint.x, rightPoint.y, 12.4, 7.5, 12, 0.15, 0.38)}
          {contourRing(rightPoint.x, rightPoint.y, 16.8, 10.1, 12, 0.1, 0.32)}
          {contourRing(rightPoint.x, rightPoint.y, 21.5, 12.9, 12, 0.06, 0.26)}

          {contourRing(midPoint.x, midPoint.y, 4.8, 2.9, 4, 0.11, 0.26)}
          {contourRing(midPoint.x, midPoint.y, 8.1, 4.9, 4, 0.075, 0.22)}
          {contourRing(midPoint.x, midPoint.y, 11.8, 7.1, 4, 0.05, 0.2)}
          {contourRing(auxRing1.x, auxRing1.y, 6.2, 3.8, -5, 0.05, 0.18)}
          {contourRing(auxRing2.x, auxRing2.y, 6.1, 3.7, 8, 0.05, 0.18)}
        </g>

        <path
          ref={pathRef}
          d={routeD}
          fill="none"
          stroke={accentColor}
          strokeWidth={1.08}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: 0,
            transition: "none",
          }}
        />

        <line
          x1={leftPoint.x + 3}
          y1={leftPoint.y - 1}
          x2={31}
          y2={69}
          stroke={darkColor}
          strokeOpacity={0.16}
          strokeWidth={0.22}
        />
        <line
          x1={rightPoint.x - 3}
          y1={rightPoint.y + 1}
          x2={rightCalloutEnd.x}
          y2={rightCalloutEnd.y}
          stroke={accentColor}
          strokeOpacity={connected ? 0.36 : 0.18}
          strokeWidth={0.22}
        />

        <g transform={`translate(${leftPoint.x} ${leftPoint.y})`}>
          <line
            x1={-6.2}
            y1={0}
            x2={6.2}
            y2={0}
            stroke={darkColor}
            strokeWidth={0.22}
            strokeOpacity={0.2}
          />
          <line
            x1={0}
            y1={-6.2}
            x2={0}
            y2={6.2}
            stroke={darkColor}
            strokeWidth={0.22}
            strokeOpacity={0.2}
          />
          <rect
            x={-2.05}
            y={-2.05}
            width={4.1}
            height={4.1}
            transform="rotate(45)"
            fill={accentColor}
            fillOpacity={0.9}
          />
          <rect
            x={-0.88}
            y={-0.88}
            width={1.76}
            height={1.76}
            transform="rotate(45)"
            fill={darkColor}
            fillOpacity={0.14}
          />
        </g>

        <g transform={`translate(${rightPoint.x} ${rightPoint.y})`}>
          <line
            x1={-6.2}
            y1={0}
            x2={6.2}
            y2={0}
            stroke={darkColor}
            strokeWidth={0.22}
            strokeOpacity={0.2}
          />
          <line
            x1={0}
            y1={-6.2}
            x2={0}
            y2={6.2}
            stroke={darkColor}
            strokeWidth={0.22}
            strokeOpacity={0.2}
          />
          <rect
            x={-2.05}
            y={-2.05}
            width={4.1}
            height={4.1}
            transform="rotate(45)"
            fill={connected ? accentColor : darkColor}
            fillOpacity={connected ? 0.9 : 0.3}
            style={{ transition: "fill 400ms, fill-opacity 400ms" }}
          />
          <rect
            x={-0.88}
            y={-0.88}
            width={1.76}
            height={1.76}
            transform="rotate(45)"
            fill={darkColor}
            fillOpacity={0.14}
          />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: "22%",
          top: "72%",
          transform: "translateY(-50%)",
          maxWidth: 190,
          lineHeight: 1.12,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--ws-mono, var(--font-mono))",
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: darkColor,
            opacity: 0.46,
            marginBottom: 6,
          }}
        >
          Origin
        </div>
        <div
          style={{
            fontFamily: "var(--ws-font, var(--font-sans))",
            fontSize: 16,
            fontWeight: 600,
            color: darkColor,
            opacity: 0.84,
          }}
        >
          {leftLabel}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: rightLabelLeft,
          top: rightLabelTop,
          transform: "translateY(-50%)",
          maxWidth: 180,
          lineHeight: 1.12,
          textAlign: "right" as const,
          pointerEvents: "none",
          transition: "left 400ms ease, top 400ms ease",
        }}
      >
        <div
          style={{
            fontFamily: "var(--ws-mono, var(--font-mono))",
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: accentColor,
            opacity: connected ? 0.54 : 0.36,
            marginBottom: 6,
            transition: "opacity 400ms",
          }}
        >
          Bridge
        </div>
        <div
          style={{
            fontFamily: "var(--ws-font, var(--font-sans))",
            fontSize: 16,
            fontWeight: 600,
            color: accentColor,
            opacity: connected ? 0.94 : 0.62,
            transition: "opacity 400ms",
          }}
        >
          {rightLabel}
        </div>
      </div>
    </div>
  );
}
