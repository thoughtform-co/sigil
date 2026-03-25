/** Dashboard journey/route payload shapes (API + prefetch + client view). */

export type DashboardRouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  generationCount: number;
  thumbnails: {
    id: string;
    fileUrl: string;
    fileType: string;
    width: number | null;
    height: number | null;
    sessionId?: string;
  }[];
};

export type DashboardJourneyItem = {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: DashboardRouteItem[];
};

export type DashboardData = {
  journeys: DashboardJourneyItem[];
};
