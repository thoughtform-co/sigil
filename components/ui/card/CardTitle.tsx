import type { ReactNode, CSSProperties } from "react";

type ActionPlacement = "inline" | "end";

type CardTitleProps = {
  children: ReactNode;
  as?: "h2" | "h3" | "span";
  action?: ReactNode;
  actionPlacement?: ActionPlacement;
  fontSize?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

export function CardTitle({
  children,
  as: Tag = "span",
  action,
  actionPlacement = "inline",
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
        justifyContent: actionPlacement === "end" ? "space-between" : "flex-start",
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
          ...(actionPlacement === "end" && action
            ? { flex: 1, minWidth: 0 }
            : {}),
        }}
      >
        {children}
      </Tag>
      {action}
    </div>
  );
}
