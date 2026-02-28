import Link from "next/link";

type BackLinkProps = {
  href: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
};

export function BackLink({ href, label, className, style }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--dawn-40)",
        textDecoration: "none",
        transition: `color var(--duration-fast)`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--gold)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--dawn-40)";
      }}
    >
      <span style={{ fontSize: "12px" }}>←</span>
      {label}
    </Link>
  );
}
