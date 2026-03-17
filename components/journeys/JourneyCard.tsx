"use client";

import Link from "next/link";
import { ImageDiskStack, type ImageDiskStackImage } from "./ImageDiskStack";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardCategory, CardTitle, CardStats, CardDivider } from "@/components/ui/card";
import { ParticleIcon } from "@/components/ui/ParticleIcon";

/** @deprecated Import JourneyCardItem from ./types instead. */
export type { JourneyCardItem } from "./types";
import type { JourneyCardItem } from "./types";

type JourneyCardProps = {
  journey: JourneyCardItem;
};

export function JourneyCard({ journey }: JourneyCardProps) {
  const category = journey.type === "learn" ? "learn" : journey.type === "branded" ? "branded" : "create";

  return (
    <CardFrame
      as={Link}
      href={`/journeys/${journey.id}`}
      prefetch={true}
      className="transition-all"
      style={{
        minHeight: 148,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "var(--space-md)",
        alignItems: "start",
        textDecoration: "none",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <CardCategory
          category={category}
          active={category === "learn" || category === "branded"}
          gap={8}
          style={{ paddingRight: 24 }}
        />

        <CardDivider marginTop={10} marginBottom={10} />

        <CardTitle
          as="h2"
          fontSize="13px"
          actionPlacement="end"
          action={
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
          }
          style={{ marginBottom: 12 }}
        >
          {journey.name}
        </CardTitle>

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

        <CardStats
          entries={[
            { value: journey.routeCount, label: `route${journey.routeCount !== 1 ? "s" : ""}` },
            { value: journey.generationCount, label: `generation${journey.generationCount !== 1 ? "s" : ""}` },
          ]}
          color="var(--dawn-70)"
          style={{ marginTop: "auto", flexDirection: "column", gap: 4 }}
        />
      </div>

      <ImageDiskStack images={journey.thumbnails} size="sm" />
    </CardFrame>
  );
}
