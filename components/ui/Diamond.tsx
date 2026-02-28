type DiamondSize = "sm" | "md" | "lg";
type DiamondColor = "gold" | "inactive" | "neutral" | "alert";

const SIZE_MAP: Record<DiamondSize, number> = { sm: 6, md: 8, lg: 12 };

const COLOR_MAP: Record<DiamondColor, string> = {
  gold: "var(--gold)",
  inactive: "var(--dawn-30)",
  neutral: "var(--dawn)",
  alert: "var(--alert)",
};

type DiamondProps = {
  size?: DiamondSize;
  color?: DiamondColor;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Diamond({
  size = "sm",
  color,
  active,
  className,
  style,
}: DiamondProps) {
  const resolvedColor = color
    ? COLOR_MAP[color]
    : active
      ? COLOR_MAP.gold
      : COLOR_MAP.inactive;

  const px = SIZE_MAP[size];

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: px,
        height: px,
        background: resolvedColor,
        transform: "rotate(45deg)",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
