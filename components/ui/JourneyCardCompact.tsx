import type { ReactNode, CSSProperties, ElementType } from "react";
import { CardFrame, type CardState } from "./CardFrame";
import { CardTitle, CardStats, CardDivider } from "./card";

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
  routeTree?: ReactNode;
  className?: string;
  style?: CSSProperties;
  prefetch?: boolean;
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
  routeTree,
  className,
  style,
  prefetch,
}: JourneyCardCompactProps) {
  const isMini = size === "mini";
  const isCompact = size === "compact";
  const isSelected = state === "selected" || state === "active";
  const isDefault = !isMini && !isCompact;

  if (isDefault) {
    const statsEntries = [];
    if (routeCount != null) statsEntries.push({ value: routeCount, label: "routes" });

    return (
      <CardFrame
        as={as}
        href={href}
        onClick={onClick}
        state={state}
        className={className}
        style={{
          padding: "10px 14px 10px 14px",
          textDecoration: "none",
          cursor: href || onClick ? "pointer" : undefined,
          ...style,
        }}
        prefetch={prefetch}
      >
        <CardTitle
          fontSize="12px"
          color={isSelected ? "var(--gold)" : "var(--dawn)"}
          action={action}
          style={{ marginBottom: 0 }}
        >
          {name}
        </CardTitle>

        <CardDivider marginTop={8} marginBottom={6} />

        {statsEntries.length > 0 && (
          <CardStats
            entries={statsEntries}
            fontSize="10px"
            color={isSelected ? "var(--gold-50, var(--gold))" : "var(--dawn-50)"}
          />
        )}

        {routeTree}
      </CardFrame>
    );
  }

  const frameStyle: CSSProperties = {
    padding: isCompact ? "8px 12px 12px" : "6px 10px",
    textDecoration: "none",
    cursor: href || onClick ? "pointer" : undefined,
    ...style,
  };

  const titleFontSize = "11px";
  const statsFontSize = isCompact ? "8px" : "9px";
  const dividerSpacing = isCompact ? 6 : 8;
  const showDivider = isCompact;
  const showStats = isCompact && (routeCount != null || generationCount != null);

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
      {isCompact && (
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
          {type === "learn" ? "learn" : type === "branded" ? "branded" : "create"}
        </div>
      )}

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

      {routeName && isCompact && (
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
