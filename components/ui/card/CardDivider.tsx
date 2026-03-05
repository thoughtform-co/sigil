import type { CSSProperties } from "react";

type CardDividerProps = {
  color?: string;
  marginTop?: number;
  marginBottom?: number;
  className?: string;
  style?: CSSProperties;
};

export function CardDivider({
  color = "var(--dawn-08)",
  marginTop = 8,
  marginBottom = 8,
  className,
  style,
}: CardDividerProps) {
  return (
    <div
      className={className}
      style={{
        borderTop: `1px solid ${color}`,
        marginTop,
        marginBottom,
        ...style,
      }}
    />
  );
}
