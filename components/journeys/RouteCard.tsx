"use client";

import { RouteSummaryCard } from "@/components/ui/cards/RouteSummaryCard";
import type { ImageDiskStackImage } from "@/components/journeys/ImageDiskStack";

export type RouteCardItem = {
  id: string;
  name: string;
  description: string | null;
  creatorName?: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
};

type RouteCardProps = {
  route: RouteCardItem;
};

export function RouteCard({ route }: RouteCardProps) {
  const stackImages: ImageDiskStackImage[] | undefined = route.thumbnailUrl
    ? [
        {
          id: route.id,
          fileUrl: route.thumbnailUrl,
          fileType: "image/png",
          width: null,
          height: null,
        },
      ]
    : undefined;

  return (
    <RouteSummaryCard
      name={route.name}
      description={route.description}
      href={`/routes/${route.id}/image`}
      updatedAt={route.updatedAt}
      waypointCount={route.waypointCount}
      creatorName={route.creatorName}
      stackImages={stackImages}
      stackSize="md"
    />
  );
}
