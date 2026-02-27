"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { JourneyPanel } from "@/components/dashboard/JourneyPanel";
import { RouteCardsPanel } from "@/components/dashboard/RouteCardsPanel";

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
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: DashboardRouteItem[];
};

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

export type DashboardData = {
  journeys: DashboardJourneyItem[];
};

async function dashboardFetcher(url: string): Promise<DashboardData> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to load dashboard");
  }
  return res.json() as Promise<DashboardData>;
}

async function adminStatsFetcher(url: string): Promise<{ adminStats: AdminStatRow[] }> {
  const res = await fetch(url);
  if (!res.ok) return { adminStats: [] };
  return res.json();
}

export function DashboardView() {
  const { isAdmin } = useAuth();
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", dashboardFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
  const { data: adminStatsData } = useSWR(
    isAdmin ? "/api/admin/dashboard-stats" : null,
    adminStatsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.journeys?.length) return;
    if (selectedJourneyId === null) {
      setSelectedJourneyId(data.journeys[0]!.id);
    }
  }, [data, selectedJourneyId]);

  if (isLoading) {
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
        {error.message}
      </div>
    );
  }

  if (!data) return null;

  const selectedJourney = data.journeys.find((j) => j.id === selectedJourneyId);
  const routes = selectedJourney?.routes ?? [];

  return (
    <section
      className="dashboard-two-panel w-full animate-fade-in-up"
      style={{
        width: "100%",
        maxWidth: 1400,
        margin: "0 0 0 var(--space-2xl)",
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: "var(--space-xl)",
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <JourneyPanel
          journeys={data.journeys}
          selectedJourneyId={selectedJourneyId}
          onSelectJourney={setSelectedJourneyId}
          onJourneyCreated={() => void mutate()}
          adminStats={adminStatsData?.adminStats ?? undefined}
          isAdmin={isAdmin}
        />
      </div>

      <div
        style={{
          borderLeft: "1px solid var(--dawn-08)",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <RouteCardsPanel
          routes={routes}
          journeyId={selectedJourneyId}
          onRouteCreated={() => void mutate()}
        />
      </div>
    </section>
  );
}
