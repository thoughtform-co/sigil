import type { CSSProperties } from "react";

export type CardStatEntry = {
  label?: string;
  value: string | number;
};

type CardStatsProps = {
  entries: CardStatEntry[];
  fontSize?: string;
  color?: string;
  gap?: number;
  className?: string;
  style?: CSSProperties;
};

export function CardStats({
  entries,
  fontSize = "9px",
  color = "var(--dawn-50)",
  gap = 10,
  className,
  style,
}: CardStatsProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color,
        display: "flex",
        gap,
        transition: "color 100ms",
        ...style,
      }}
    >
      {entries.map((entry, i) => (
        <span key={i}>{entry.label ? `${entry.value} ${entry.label}` : entry.value}</span>
      ))}
    </div>
  );
}
