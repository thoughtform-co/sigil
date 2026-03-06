"use client";

import Link from "next/link";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardCategory, CardTitle, CardStats, CardDivider } from "@/components/ui/card";
import { ParticleIcon } from "@/components/ui/ParticleIcon";
import { ImageDiskStack } from "./ImageDiskStack";
import type { JourneyCardItem } from "./types";

type JourneyOverviewCardProps = {
  journey: JourneyCardItem;
  featured?: boolean;
};

export function JourneyOverviewCard({ journey, featured = false }: JourneyOverviewCardProps) {
  const category = journey.type === "learn" ? "learn" : "create";
  const hasMedia = journey.thumbnails.length > 0;
  const routeNames = journey.routes.slice(0, 3).map((r) => r.name);

  if (featured && hasMedia) {
    return (
      <CardFrame
        as={Link}
        href={`/journeys/${journey.id}`}
        prefetch
        className="transition-all"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--space-lg)",
          alignItems: "start",
          textDecoration: "none",
          padding: "16px 20px 20px",
        }}
      >
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <CardCategory
            category={category}
            active={category === "learn"}
            gap={8}
          />

          <CardDivider marginTop={10} marginBottom={10} />

          <CardTitle
            as="h2"
            fontSize="14px"
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
            style={{ marginBottom: 10 }}
          >
            {journey.name}
          </CardTitle>

          {journey.description && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                lineHeight: "1.6",
                color: "var(--dawn-50)",
                marginBottom: "12px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {journey.description}
            </p>
          )}

          <CardDivider marginTop={0} marginBottom={8} />

          <CardStats
            entries={[
              { value: journey.routeCount, label: journey.routeCount === 1 ? "route" : "routes" },
            ]}
            fontSize="10px"
            color="var(--dawn-50)"
          />

          {routeNames.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {routeNames.map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--dawn-30)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        <ImageDiskStack images={journey.thumbnails} size="sm" />
      </CardFrame>
    );
  }

  return (
    <CardFrame
      as={Link}
      href={`/journeys/${journey.id}`}
      prefetch
      className="transition-all"
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        padding: "14px 16px 16px",
      }}
    >
      <CardCategory
        category={category}
        active={category === "learn"}
        gap={6}
      />

      <CardDivider marginTop={8} marginBottom={8} />

      <CardTitle
        as="h2"
        fontSize="12px"
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
        style={{ marginBottom: 8 }}
      >
        {journey.name}
      </CardTitle>

      {journey.description && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            lineHeight: "1.5",
            color: "var(--dawn-40)",
            marginBottom: "8px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {journey.description}
        </p>
      )}

      <div style={{ marginTop: "auto", paddingTop: 4 }}>
        <CardStats
          entries={[
            { value: journey.routeCount, label: journey.routeCount === 1 ? "route" : "routes" },
          ]}
          fontSize="10px"
          color="var(--dawn-50)"
        />
      </div>
    </CardFrame>
  );
}
