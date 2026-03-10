"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { JourneyCardCompact } from "@/components/ui/JourneyCardCompact";
import { SectionHeader } from "@/components/ui/SectionHeader";

const JourneyPanel = dynamic(
  () => import("@/components/dashboard/JourneyPanel").then((m) => m.JourneyPanel),
  { ssr: false },
);

const RouteCardsPanel = dynamic(
  () => import("@/components/dashboard/RouteCardsPanel").then((m) => m.RouteCardsPanel),
  { ssr: false },
);

const RouteActivityPanel = dynamic(
  () => import("@/components/dashboard/RouteActivityPanel").then((m) => m.RouteActivityPanel),
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
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"focused" | "overview">("focused");

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
  const isOverview = viewMode === "overview";

  const disclosureToggle = (
    <button
      type="button"
      onClick={() => setViewMode((m) => (m === "focused" ? "overview" : "focused"))}
      aria-expanded={isOverview}
      aria-label={isOverview ? "Show focused workspace" : "Show all journeys"}
      title={isOverview ? "Show focused workspace" : "Show all journeys"}
      style={{
        position: "fixed",
        bottom: "var(--hud-padding)",
        left: "calc(var(--hud-padding) + 28px)",
        zIndex: 45,
        background: "transparent",
        border: "none",
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: "14px",
        lineHeight: 1,
        color: isOverview ? "var(--gold)" : "var(--dawn-40)",
        transition: "color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--gold)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = isOverview ? "var(--gold)" : "var(--dawn-40)";
      }}
    >
      {isOverview ? "\u2039" : "\u203A"}
    </button>
  );

  return (
    <>
      {disclosureToggle}
      <section
        className="dashboard-two-panel w-full animate-fade-in-up"
        style={{
          alignSelf: "flex-start",
          width: "100%",
          maxWidth: "var(--layout-content-lg, 1400px)",
          margin: 0,
          height: "100%",
          minHeight: 0,
          position: "relative",
          display: "grid",
          gridTemplateColumns: isOverview ? "1fr" : "360px 1fr 280px",
          gap: "var(--space-xl)",
        }}
      >

      {!isOverview && (
        <svg
          aria-hidden
          width="60"
          height="1"
          viewBox="0 0 60 1"
          fill="none"
          style={{
            position: "absolute",
            left: 344,
            top: 38,
            pointerEvents: "none",
          }}
        >
          <path
            d="M0 0H60"
            stroke="var(--dawn-15)"
            strokeWidth="1"
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <div style={{ minHeight: 0, overflow: isOverview ? "auto" : "hidden", display: "flex", flexDirection: "column" }}>
        {isOverview ? (
          <>
            <SectionHeader
              label="JOURNEYS"
              action={
                isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("focused")}
                    title="Create journey"
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      color: "var(--dawn-30)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      lineHeight: 1,
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--dawn-30)"; }}
                  >
                    +
                  </button>
                ) : undefined
              }
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", paddingTop: "var(--space-sm)", maxWidth: 360 }}>
              {data.journeys.map((j, index) => (
                <div key={j.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.04}s` }}>
                  <JourneyCardCompact
                    name={j.name}
                    type={j.type === "learn" ? "learn" : "create"}
                    routeCount={j.routeCount}
                    href={`/journeys/${j.id}`}
                    routeTree={
                      j.routes.length > 0 ? (
                        <div style={{ paddingLeft: 12, paddingTop: 6 }}>
                          {j.routes.map((r, ri) => (
                            <div
                              key={r.id}
                              style={{
                                position: "relative",
                                paddingLeft: 14,
                                marginBottom: ri === j.routes.length - 1 ? 0 : 6,
                              }}
                            >
                              <svg
                                aria-hidden
                                width="14"
                                height="20"
                                viewBox="0 0 14 20"
                                fill="none"
                                style={{ position: "absolute", left: 0, top: -2 }}
                              >
                                <path
                                  d="M0 0V10H13"
                                  stroke="var(--dawn-15)"
                                  strokeWidth="1"
                                  strokeLinecap="square"
                                  strokeLinejoin="miter"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "9px",
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  color: "var(--dawn-50)",
                                }}
                              >
                                {r.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <JourneyPanel
            journeys={data.journeys}
            selectedJourneyId={selectedJourneyId}
            onSelectJourney={(id) => {
              setSelectedJourneyId(id);
              setSelectedRouteId(null);
            }}
            onSelectRoute={setSelectedRouteId}
            onJourneyCreated={() => void mutate()}
            onJourneyDeleted={handleJourneyDeleted}
            onJourneyRenamed={handleJourneyRenamed}
            adminStats={adminStatsData?.adminStats ?? undefined}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {!isOverview && (
        <div
          style={{
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RouteCardsPanel
            routes={routes}
            journeyId={selectedJourneyId}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            onRouteCreated={() => void mutate()}
            onRouteDeleted={handleRouteDeleted}
            onRouteRenamed={handleRouteRenamed}
          />
        </div>
      )}

      {!isOverview && (
        <div
          className="dashboard-activity-col"
          style={{
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--dawn-08)",
            paddingLeft: "var(--space-md)",
          }}
        >
          <RouteActivityPanel routeId={selectedRouteId} />
        </div>
      )}
      </section>
    </>
  );
}
