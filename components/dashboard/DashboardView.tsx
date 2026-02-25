"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { JourneyPanel } from "@/components/dashboard/JourneyPanel";
import { RoutePanel } from "@/components/dashboard/RoutePanel";
import { SigilPanel } from "@/components/dashboard/SigilPanel";

export type DashboardRouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  generationCount: number;
  thumbnails: { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null; sessionId?: string }[];
};

export type DashboardJourneyItem = {
  id: string;
  name: string;
  description: string | null;
  routeCount: number;
  generationCount: number;
  routes: DashboardRouteItem[];
};

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

type DashboardData = {
  journeys: DashboardJourneyItem[];
  adminStats?: AdminStatRow[];
};

export function DashboardView() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load dashboard");
        }
        const json = (await res.json()) as DashboardData & { gallery?: unknown[] };
        const { gallery: _g, ...rest } = json;
        setData(rest as DashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Default to first journey and first route when data loads
  useEffect(() => {
    if (!data?.journeys?.length) return;
    if (selectedJourneyId === null) {
      setSelectedJourneyId(data.journeys[0]!.id);
    }
  }, [data, selectedJourneyId]);

  useEffect(() => {
    if (!data?.journeys?.length || selectedJourneyId === null) return;
    const journey = data.journeys.find((j) => j.id === selectedJourneyId);
    const routes = journey?.routes ?? [];
    if (routes.length > 0 && selectedRouteId === null) {
      setSelectedRouteId(routes[0]!.id);
    }
    if (routes.length > 0 && selectedRouteId !== null && !routes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(routes[0]!.id);
    }
    if (routes.length === 0) {
      setSelectedRouteId(null);
    }
  }, [data, selectedJourneyId, selectedRouteId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div
          style={{
            width: "6px",
            height: "6px",
            background: "var(--gold)",
            animation: "glowPulse 1.5s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
          }}
        >
          Loading dashboard...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "10px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--status-error)",
          background: "rgba(193, 127, 89, 0.1)",
          border: "1px solid rgba(193, 127, 89, 0.2)",
        }}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const selectedJourney = data.journeys.find((j) => j.id === selectedJourneyId);
  const routes = selectedJourney?.routes ?? [];
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  return (
    <section
      className="dashboard-three-panel w-full animate-fade-in-up"
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 0 0 var(--space-2xl)",
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "260px 1fr 320px",
        gap: "var(--space-xl)",
      }}
    >
      <div className="dashboard-left-middle">
        <div style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <JourneyPanel
            journeys={data.journeys}
            selectedJourneyId={selectedJourneyId}
            onSelectJourney={setSelectedJourneyId}
            adminStats={data.adminStats}
            isAdmin={isAdmin}
          />
        </div>
        <div
          style={{
            borderLeft: "1px solid var(--dawn-08)",
            borderRight: "1px solid var(--dawn-08)",
            paddingLeft: "var(--space-xl)",
            paddingRight: "var(--space-xl)",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RoutePanel
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
          />
        </div>
      </div>

      <div style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <SigilPanel
          routeId={selectedRoute?.id ?? null}
          routeName={selectedRoute?.name ?? ""}
          description={selectedRoute?.description ?? null}
          thumbnails={selectedRoute?.thumbnails ?? []}
        />
      </div>
    </section>
  );
}
