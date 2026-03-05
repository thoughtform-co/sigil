import Link from "next/link";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardStats, CardDivider } from "@/components/ui/card";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  waypointCount?: number;
};

export function ProjectCard({ id, name, description, updatedAt, waypointCount }: ProjectCardProps) {
  const statsEntries = [];
  if (waypointCount !== undefined) {
    statsEntries.push({ value: waypointCount, label: `waypoint${waypointCount !== 1 ? "s" : ""}` });
  }
  statsEntries.push({ value: `updated ${updatedAt}` });

  return (
    <CardFrame
      as={Link}
      href={`/routes/${id}/image`}
      className="transition-all"
      style={{
        padding: "20px",
        textDecoration: "none",
      }}
    >
      <CardTitle
        as="h2"
        fontSize="13px"
        action={
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
        }
        style={{ marginBottom: 12 }}
      >
        {name}
      </CardTitle>

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

      <CardDivider marginTop={0} marginBottom={12} />

      <CardStats
        entries={statsEntries}
        color="var(--dawn-30)"
        style={{ flexDirection: "column", gap: 4 }}
      />
    </CardFrame>
  );
}
