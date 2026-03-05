import type { CSSProperties } from "react";
import { Diamond } from "../Diamond";

type CardCategoryProps = {
  category: string;
  active?: boolean;
  fontSize?: string;
  gap?: number;
  className?: string;
  style?: CSSProperties;
};

export function CardCategory({
  category,
  active = false,
  fontSize = "9px",
  gap = 6,
  className,
  style,
}: CardCategoryProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        fontFamily: "var(--font-mono)",
        fontSize,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--dawn-40)",
        ...style,
      }}
    >
      <Diamond active={active} size="sm" />
      {category}
    </div>
  );
}
