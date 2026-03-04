import type { ReactNode, CSSProperties, ElementType } from "react";
import { CardFrame } from "./CardFrame";
import { Diamond } from "./Diamond";

type JourneyCardCompactProps = {
  name: string;
  type?: string;
  routeName?: string;
  routeCount?: number;
  generationCount?: number;
  href?: string;
  onClick?: () => void;
  as?: ElementType;
  selected?: boolean;
  size?: "default" | "compact" | "mini";
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
  prefetch?: boolean;
};

const PADDING: Record<string, string> = {
  default: "10px 14px 14px",
  compact: "8px 12px 12px",
  mini: "6px 10px",
};

export function JourneyCardCompact({
  name,
  type,
  routeName,
  routeCount,
  generationCount,
  href,
  onClick,
  as,
  selected = false,
  size = "default",
  action,
  className,
  style,
  prefetch,
}: JourneyCardCompactProps) {
  const category = type === "learn" ? "learn" : "create";
  const isMini = size === "mini";
  const isCompact = size === "compact";
  const showDivider = !isMini;
  const showStats = !isMini && (routeCount != null || generationCount != null);

  const frameStyle: CSSProperties = {
    padding: PADDING[size],
    textDecoration: "none",
    cursor: href || onClick ? "pointer" : undefined,
    ...(selected
      ? { background: "var(--gold-10)", borderColor: "var(--gold-30, rgba(202,165,84,0.3))" }
      : {}),
    ...style,
  };

  const titleFontSize = isMini ? "11px" : isCompact ? "11px" : "12px";
  const statsFontSize = isCompact ? "8px" : "9px";

  return (
    <CardFrame
      as={as}
      href={href}
      onClick={onClick}
      className={className}
      style={frameStyle}
      prefetch={prefetch}
    >
      {/* Category row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--dawn-40)",
        }}
      >
        <Diamond active={category === "learn"} size="sm" />
        {category}
      </div>

      {showDivider && (
        <div style={{ borderTop: "1px solid var(--dawn-08)", marginTop: isCompact ? 6 : 8, marginBottom: isCompact ? 6 : 8 }} />
      )}

      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: isMini ? 4 : 0,
          marginBottom: isMini ? 0 : routeName ? 2 : 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: titleFontSize,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: selected ? "var(--gold)" : "var(--dawn)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 100ms",
          }}
        >
          {name}
        </span>
        {action}
      </div>

      {/* Route name -- compact and default when provided */}
      {routeName && !isMini && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: isCompact ? "10px" : "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--dawn-50)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 4,
          }}
        >
          {routeName}
        </div>
      )}

      {/* Stats row */}
      {showStats && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: statsFontSize,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: selected ? "var(--gold-50, var(--gold))" : "var(--dawn-50)",
            display: "flex",
            gap: 10,
            transition: "color 100ms",
          }}
        >
          {routeCount != null && <span>{routeCount} routes</span>}
          {generationCount != null && <span>{generationCount} gen</span>}
        </div>
      )}
    </CardFrame>
  );
}
