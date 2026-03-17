import type { CSSProperties } from "react";

type MapPoint = [number, number];

type WaypointNode = {
  x: number;
  y: number;
  scale?: number;
};

type WaypointRoute = {
  points: MapPoint[];
  dashed?: boolean;
  opacity?: number;
  width?: number;
};

type WaypointTopographyProps = {
  accentColor?: string;
  darkColor?: string;
  nodes?: WaypointNode[];
  routes?: WaypointRoute[];
  showGrid?: boolean;
  gridStep?: number;
  preserveAspectRatio?: string;
  className?: string;
  style?: CSSProperties;
};

function fmt(value: number) {
  return Number(value.toFixed(2));
}

function buildContourPath(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const points = 56;
  let d = "";

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const waveA = Math.sin(angle * 3 + seed * 0.9) * 0.085;
    const waveB = Math.cos(angle * 5 - seed * 0.55) * 0.05;
    const waveC = Math.sin(angle * 7 + seed * 1.3) * 0.025;
    const radiusScale = 1 + waveA + waveB + waveC;
    const x = fmt(cx + Math.cos(angle) * rx * radiusScale);
    const y = fmt(cy + Math.sin(angle) * ry * radiusScale);
    d += `${i === 0 ? "M" : "L"} ${x} ${y} `;
  }

  return `${d}Z`;
}

function buildRoutePath(points: MapPoint[]) {
  if (points.length === 0) return "";

  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${fmt(x)} ${fmt(y)}`)
    .join(" ");
}

export function WaypointTopography({
  accentColor = "#FE6744",
  darkColor = "#241D1B",
  nodes = [],
  routes = [],
  showGrid = true,
  gridStep = 10,
  preserveAspectRatio = "xMidYMid slice",
  className,
  style,
}: WaypointTopographyProps) {
  const gridStops = Array.from({ length: Math.floor(100 / gridStep) + 1 }, (_, i) => i * gridStep);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    >
      {showGrid && (
        <g fill="none" stroke={darkColor} strokeWidth={0.18} strokeOpacity={0.1}>
          {gridStops.map((stop) => (
            <line
              key={`v-${stop}`}
              x1={stop}
              y1={0}
              x2={stop}
              y2={100}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {gridStops.map((stop) => (
            <line
              key={`h-${stop}`}
              x1={0}
              y1={stop}
              x2={100}
              y2={stop}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      <g fill="none" stroke={accentColor}>
        {nodes.flatMap((node, nodeIndex) => {
          const scale = node.scale ?? 1;
          const rings = [
            { rx: 7 * scale, ry: 4.9 * scale, opacity: 0.12, width: 0.28 },
            { rx: 10 * scale, ry: 6.9 * scale, opacity: 0.16, width: 0.32 },
            { rx: 13.5 * scale, ry: 9.3 * scale, opacity: 0.26, width: 0.42 },
            { rx: 17.5 * scale, ry: 11.8 * scale, opacity: 0.18, width: 0.34 },
            { rx: 22 * scale, ry: 14.5 * scale, opacity: 0.13, width: 0.28 },
          ];

          return rings.map((ring, ringIndex) => (
            <path
              key={`ring-${nodeIndex}-${ringIndex}`}
              d={buildContourPath(node.x, node.y, ring.rx, ring.ry, nodeIndex * 2.7 + ringIndex + 1)}
              strokeOpacity={ring.opacity}
              strokeWidth={ring.width}
              vectorEffect="non-scaling-stroke"
            />
          ));
        })}
      </g>

      <g fill="none" stroke={accentColor} strokeLinecap="round" strokeLinejoin="round">
        {routes.map((route, routeIndex) => (
          <path
            key={`route-${routeIndex}`}
            d={buildRoutePath(route.points)}
            strokeWidth={route.width ?? 0.65}
            strokeOpacity={route.opacity ?? 0.6}
            strokeDasharray={route.dashed ? "2.2 1.8" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      <g>
        {nodes.map((node, index) => (
          <g key={`node-${index}`} transform={`translate(${fmt(node.x)} ${fmt(node.y)})`}>
            <line
              x1={-5}
              y1={0}
              x2={5}
              y2={0}
              stroke={darkColor}
              strokeOpacity={0.18}
              strokeWidth={0.24}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={0}
              y1={-5}
              x2={0}
              y2={5}
              stroke={darkColor}
              strokeOpacity={0.18}
              strokeWidth={0.24}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={-1.55}
              y={-1.55}
              width={3.1}
              height={3.1}
              transform="rotate(45)"
              fill={accentColor}
              fillOpacity={0.9}
            />
            <rect
              x={-0.78}
              y={-0.78}
              width={1.56}
              height={1.56}
              transform="rotate(45)"
              fill={darkColor}
              fillOpacity={0.12}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
