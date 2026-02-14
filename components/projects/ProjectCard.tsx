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
      href={`/projects/${id}`}
      className="group block border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4 transition-all hover:border-[var(--gold)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn)",
          }}
        >
          {name}
        </h2>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.08em",
            color: "var(--dawn-30)",
            textTransform: "uppercase",
          }}
        >
          open
        </span>
      </div>

      <p className="mb-4 text-sm text-[var(--dawn-50)]">{description}</p>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn-30)",
        }}
      >
        updated {updatedAt}
      </div>
    </Link>
  );
}
