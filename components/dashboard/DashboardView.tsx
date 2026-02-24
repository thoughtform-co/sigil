"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ImageGallery } from "@/components/dashboard/ImageGallery";
import { JourneyList } from "@/components/dashboard/JourneyList";
import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";

type GalleryItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  width: number | null;
  height: number | null;
  prompt: string;
  modelId: string;
  sessionName: string;
  projectName: string;
};

type RouteItem = {
  id: string;
  name: string;
  updatedAt: string;
  waypointCount: number;
};

type JourneyItem = {
  id: string;
  name: string;
  description: string | null;
  routeCount: number;
  generationCount: number;
  routes: RouteItem[];
};

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

type DashboardData = {
  gallery: GalleryItem[];
  journeys: JourneyItem[];
  adminStats?: AdminStatRow[];
};

export function DashboardView() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load dashboard");
        }
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

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

  return (
    <section
      className="w-full animate-fade-in-up"
      style={{
        paddingTop: "var(--space-2xl)",
        display: "flex",
        gap: "var(--space-md)",
        alignItems: "flex-start",
      }}
    >
      {/* Spacer: gives the left nav breathing room and centers gallery */}
      <div style={{ flex: "0 0 96px" }} />

      {/* Center: gallery within a subtle square frame */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "min(100%, 960px)",
          border: "1px solid var(--dawn-08)",
          padding: "var(--space-md)",
          background: "transparent",
        }}
      >
        <ImageGallery items={data.gallery} />
      </div>

      {/* Right: journeys + admin stats */}
      <aside
        style={{
          flex: "0 0 220px",
          marginLeft: "auto",
          marginRight: "32px",
          position: "sticky",
          top: "calc(var(--hud-padding) + 80px)",
          textAlign: "right",
        }}
      >
        <JourneyList journeys={data.journeys} />
        {isAdmin && data.adminStats && (
          <AdminStatsPanel stats={data.adminStats} />
        )}
      </aside>
    </section>
  );
}
