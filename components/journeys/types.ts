import type { ImageDiskStackImage } from "./ImageDiskStack";

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
