import type { ReactNode, CSSProperties } from "react";

type CardTitleProps = {
  children: ReactNode;
  as?: "h2" | "h3" | "span";
  action?: ReactNode;
  fontSize?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function CardTitle({
  children,
  as: Tag = "span",
  action,
  fontSize = "13px",
  color = "var(--dawn)",
  className,
  style,
}: CardTitleProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        ...style,
      }}
    >
      <Tag
        style={{
          fontFamily: "var(--font-mono)",
          fontSize,
          fontWeight: 400,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          margin: 0,
          transition: "color 100ms",
        }}
      >
        {children}
      </Tag>
      {action}
    </div>
  );
}
