"use client";

import Link from "next/link";
import { ImageDiskStack, type ImageDiskStackImage } from "./ImageDiskStack";
import { CardFrame } from "@/components/ui/CardFrame";
import { CategoryRow } from "@/components/ui/CategoryRow";
import { ParticleIcon } from "@/components/ui/ParticleIcon";

export type JourneyCardItem = {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: { id: string; name: string; updatedAt: string; waypointCount: number }[];
  thumbnails: ImageDiskStackImage[];
};

type JourneyCardProps = {
  journey: JourneyCardItem;
};

export function JourneyCard({ journey }: JourneyCardProps) {
  const category = journey.type === "learn" ? "learn" : "create";

  return (
    <CardFrame
      as={Link}
      href={`/journeys/${journey.id}`}
      className="transition-all"
      style={{
        minHeight: 148,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "var(--space-md)",
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <CategoryRow category={category} active={category === "learn"} style={{ paddingRight: 24 }} />

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {journey.name}
          </h2>
          <span
            className="transition-colors group-hover:text-[var(--gold)]"
            style={{
              color: "var(--dawn-50)",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              transitionDuration: "var(--duration-fast)",
            }}
            aria-hidden="true"
          >
            <ParticleIcon glyph="arrow" size="sm" />
          </span>
        </div>

        {journey.description ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              lineHeight: "1.6",
              color: "var(--dawn-50)",
              marginBottom: "12px",
            }}
          >
            {journey.description}
          </p>
        ) : null}

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--dawn-70)",
            marginTop: "auto",
          }}
        >
          <span style={{ display: "block", marginBottom: "4px" }}>
            {journey.routeCount} route{journey.routeCount !== 1 ? "s" : ""}
          </span>
          <span style={{ display: "block" }}>
            {journey.generationCount} generation{journey.generationCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <ImageDiskStack images={journey.thumbnails} size="sm" />
    </CardFrame>
  );
}
