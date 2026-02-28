import { Diamond } from "./Diamond";

type CategoryRowProps = {
  category: string;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function CategoryRow({
  category,
  active = false,
  className,
  style,
}: CategoryRowProps) {
  return (
    <div className={className} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--dawn-40)",
        }}
      >
        <Diamond active={active} />
        {category}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--dawn-08)",
          marginTop: 10,
          paddingTop: 10,
        }}
      />
    </div>
  );
}
