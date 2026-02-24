import Link from "next/link";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
};

export function ProjectCard({ id, name, description, updatedAt }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${id}/image`}
      className="group relative block overflow-hidden transition-all"
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--dawn-08)",
        padding: "20px",
        transitionDuration: "var(--duration-base)",
        transitionTimingFunction: "var(--ease-out)",
      }}
    >
      {/* Corner accents — visible on hover */}
      <span
        className="pointer-events-none absolute -left-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -right-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -bottom-px -left-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -bottom-px -right-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />

      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn)",
          }}
        >
          {name}
        </h2>
        <span
          className="transition-colors group-hover:text-[var(--gold)]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
            flexShrink: 0,
            transitionDuration: "var(--duration-fast)",
          }}
        >
          open &rarr;
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          lineHeight: "1.6",
          color: "var(--dawn-50)",
          marginBottom: "16px",
        }}
      >
        {description}
      </p>

      {/* Footer metadata */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--dawn-30)",
          borderTop: "1px solid var(--dawn-08)",
          paddingTop: "12px",
        }}
      >
        updated {updatedAt}
      </div>
    </Link>
  );
}
