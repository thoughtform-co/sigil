import Link from "next/link";
import type { CSSProperties } from "react";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardStats, CardDivider } from "@/components/ui/card";
import { OpenRouteLinkAffordance } from "@/components/ui/card/OpenRouteLinkAffordance";
import { ImageDiskStack, type ImageDiskStackImage } from "@/components/journeys/ImageDiskStack";

type RouteSummaryCardProps = {
  name: string;
  description: string | null;
  href: string;
  updatedAt: string;
  waypointCount?: number;
  creatorName?: string | null;
  /** Thumbnail stack on the right; omit for text-only layout */
  stackImages?: ImageDiskStackImage[];
  stackSize?: "sm" | "md";
  gridStyle?: CSSProperties;
};

/**
 * Shared “route briefing” link card: title, optional media stack, stats.
 * Used on journeys list and projects list surfaces.
 */
export function RouteSummaryCard({
  name,
  description,
  href,
  updatedAt,
  waypointCount,
  creatorName,
  stackImages,
  stackSize = "md",
  gridStyle,
}: RouteSummaryCardProps) {
  const statsEntries: { value: string | number; label?: string }[] = [];
  if (waypointCount !== undefined) {
    statsEntries.push({
      value: waypointCount,
      label: `waypoint${waypointCount !== 1 ? "s" : ""}`,
    });
  }
  statsEntries.push({ value: `updated ${new Date(updatedAt).toLocaleDateString()}` });

  const defaultGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: stackImages?.length ? "1fr auto" : "1fr",
    gap: "var(--space-md)",
    alignItems: "start",
    textDecoration: "none",
  };

  return (
    <CardFrame
      as={Link}
      href={href}
      prefetch={true}
      className="transition-all"
      style={{
        padding: "20px",
        ...defaultGrid,
        ...gridStyle,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <CardTitle
          as="h2"
          fontSize="13px"
          actionPlacement="end"
          action={<OpenRouteLinkAffordance />}
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
            marginBottom: creatorName ? "10px" : "16px",
          }}
        >
          {description ?? "No description"}
        </p>

        {creatorName ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              color: "var(--dawn-30)",
              marginBottom: "16px",
            }}
          >
            CREATED BY{" "}
            <span
              style={{
                color: "var(--dawn-50)",
                textTransform: "none",
                letterSpacing: "0.03em",
              }}
            >
              {creatorName}
            </span>
          </div>
        ) : null}

        <CardDivider marginTop={0} marginBottom={12} />

        <CardStats
          entries={statsEntries}
          color="var(--dawn-70)"
          style={{ flexDirection: "column", gap: 4 }}
        />
      </div>

      {stackImages && stackImages.length > 0 ? (
        <ImageDiskStack images={stackImages} size={stackSize} />
      ) : null}
    </CardFrame>
  );
}
