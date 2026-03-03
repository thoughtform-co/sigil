"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const JourneyPanel = dynamic(
  () => import("@/components/dashboard/JourneyPanel").then((m) => m.JourneyPanel),
  { ssr: false },
);

const RouteCardsPanel = dynamic(
  () => import("@/components/dashboard/RouteCardsPanel").then((m) => m.RouteCardsPanel),
  { ssr: false },
);

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

export function DashboardView({
  initialData,
  initialIsAdmin,
  initialDataIncludesThumbnails = true,
}: {
  initialData?: DashboardData;
  initialIsAdmin?: boolean;
  initialDataIncludesThumbnails?: boolean;
} = {}) {
  const { isAdmin: authIsAdmin } = useAuth();
  const isAdmin = initialIsAdmin ?? authIsAdmin;
  const perfMarked = useRef<boolean | null>(null);
  if (perfMarked.current == null) {
    perfMarked.current = true;
    if (typeof performance !== "undefined") performance.mark("sigil:dashboard-mount");
  }
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", dashboardFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    revalidateOnMount: !initialData || !initialDataIncludesThumbnails,
  });
  const { data: adminStatsData } = useSWR(
    isAdmin ? "/api/admin/dashboard-stats" : null,
    adminStatsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  const handleJourneyDeleted = useCallback((id: string) => {
    void mutate(
      (cur) => cur ? { journeys: cur.journeys.filter((j) => j.id !== id) } : cur,
      { revalidate: false },
    );
    setSelectedJourneyId((prev) => prev === id ? null : prev);
  }, [mutate]);

  const handleJourneyRenamed = useCallback((id: string, name: string) => {
    void mutate(
      (cur) => cur ? { journeys: cur.journeys.map((j) => j.id === id ? { ...j, name } : j) } : cur,
      { revalidate: false },
    );
  }, [mutate]);

  const handleRouteDeleted = useCallback((routeId: string) => {
    void mutate(
      (cur) => cur ? {
        journeys: cur.journeys.map((j) => ({
          ...j,
          routes: j.routes.filter((r) => r.id !== routeId),
          routeCount: j.routes.some((r) => r.id === routeId) ? j.routeCount - 1 : j.routeCount,
        })),
      } : cur,
      { revalidate: false },
    );
  }, [mutate]);

  const handleRouteRenamed = useCallback((routeId: string, name: string) => {
    void mutate(
      (cur) => cur ? {
        journeys: cur.journeys.map((j) => ({
          ...j,
          routes: j.routes.map((r) => r.id === routeId ? { ...r, name } : r),
        })),
      } : cur,
      { revalidate: false },
    );
  }, [mutate]);

  const dataReadyMarked = useRef(false);

  useEffect(() => {
    if (!dataReadyMarked.current && data) {
      dataReadyMarked.current = true;
      performance.mark("sigil:dashboard-data-ready");
      if (performance.getEntriesByName("sigil:dashboard-mount").length > 0) {
        performance.measure("sigil:dashboard-ttdr", "sigil:dashboard-mount", "sigil:dashboard-data-ready");
      }
    }
  }, [data]);

  useEffect(() => {
    if (!data?.journeys?.length) return;
    if (selectedJourneyId === null) {
      setSelectedJourneyId(data.journeys[0]!.id);
    }
  }, [data, selectedJourneyId]);

  if (isLoading && !data) {
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
          onJourneyDeleted={handleJourneyDeleted}
          onJourneyRenamed={handleJourneyRenamed}
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
          onRouteDeleted={handleRouteDeleted}
          onRouteRenamed={handleRouteRenamed}
        />
      </div>
    </section>
  );
}
