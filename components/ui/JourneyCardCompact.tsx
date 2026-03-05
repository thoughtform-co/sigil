import type { ReactNode, CSSProperties, ElementType } from "react";
import { CardFrame, type CardState } from "./CardFrame";
import { CardCategory, CardTitle, CardStats, CardDivider } from "./card";

type JourneyCardCompactProps = {
  name: string;
  type?: string;
  routeName?: string;
  routeCount?: number;
  generationCount?: number;
  href?: string;
  onClick?: () => void;
  as?: ElementType;
  state?: CardState;
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
  state = "default",
  size = "default",
  action,
  className,
  style,
  prefetch,
}: JourneyCardCompactProps) {
  const category = type === "learn" ? "learn" : "create";
  const isMini = size === "mini";
  const isCompact = size === "compact";
  const isSelected = state === "selected" || state === "active";

  const showDivider = !isMini;
  const showStats = !isMini && (routeCount != null || generationCount != null);

  const frameStyle: CSSProperties = {
    padding: PADDING[size],
    textDecoration: "none",
    cursor: href || onClick ? "pointer" : undefined,
    ...style,
  };

  const titleFontSize = isMini ? "11px" : isCompact ? "11px" : "12px";
  const statsFontSize = isCompact ? "8px" : "9px";
  const dividerSpacing = isCompact ? 6 : 8;

  const statsEntries = [];
  if (routeCount != null) statsEntries.push({ value: routeCount, label: "routes" });
  if (generationCount != null) statsEntries.push({ value: generationCount, label: "gen" });

  return (
    <CardFrame
      as={as}
      href={href}
      onClick={onClick}
      state={state}
      className={className}
      style={frameStyle}
      prefetch={prefetch}
    >
      <CardCategory category={category} active={category === "learn"} />

      {showDivider && (
        <CardDivider marginTop={dividerSpacing} marginBottom={dividerSpacing} />
      )}

      <CardTitle
        fontSize={titleFontSize}
        color={isSelected ? "var(--gold)" : "var(--dawn)"}
        action={action}
        style={{
          marginTop: isMini ? 4 : 0,
          marginBottom: isMini ? 0 : routeName ? 2 : 6,
        }}
      >
        {name}
      </CardTitle>

      {routeName && !isMini && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
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

      {showStats && (
        <CardStats
          entries={statsEntries}
          fontSize={statsFontSize}
          color={isSelected ? "var(--gold-50, var(--gold))" : "var(--dawn-50)"}
        />
      )}
    </CardFrame>
  );
}
