"use client";

import Link from "next/link";
import { ImageDiskStack } from "./ImageDiskStack";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardStats, CardDivider } from "@/components/ui/card";

export type RouteCardItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
};

type RouteCardProps = {
  route: RouteCardItem;
};

export function RouteCard({ route }: RouteCardProps) {
  const thumbnails = route.thumbnailUrl
    ? [
        {
          id: route.id,
          fileUrl: route.thumbnailUrl,
          fileType: "image/png",
          width: null as number | null,
          height: null as number | null,
        },
      ]
    : [];

  return (
    <CardFrame
      as={Link}
      href={`/routes/${route.id}/image`}
      prefetch={true}
      className="transition-all"
      style={{
        padding: "20px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "var(--space-md)",
        alignItems: "start",
        textDecoration: "none",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <CardTitle
          as="h2"
          fontSize="13px"
          actionPlacement="end"
          action={
            <span
              className="transition-colors group-hover:text-[var(--gold)]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--dawn-70)",
                flexShrink: 0,
                transitionDuration: "var(--duration-fast)",
              }}
            >
              open &rarr;
            </span>
          }
          style={{ marginBottom: 12 }}
        >
          {route.name}
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
          {route.description ?? "No description"}
        </p>

        <CardDivider marginTop={0} marginBottom={12} />

        <CardStats
          entries={[
            { value: route.waypointCount, label: `waypoint${route.waypointCount !== 1 ? "s" : ""}` },
            { value: `updated ${new Date(route.updatedAt).toLocaleDateString()}` },
          ]}
          color="var(--dawn-70)"
          style={{ flexDirection: "column", gap: 4 }}
        />
      </div>

      <ImageDiskStack images={thumbnails} size="md" />
    </CardFrame>
  );
}
