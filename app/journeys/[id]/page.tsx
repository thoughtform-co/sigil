"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { HudPanel, HudPanelHeader, HudEmptyState } from "@/components/ui/hud";

type RouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
};

type JourneyData = {
  journey: {
    id: string;
    name: string;
    description: string | null;
    routeCount: number;
    routes: RouteItem[];
  };
};

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/journeys/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            setError("Journey not found");
            return;
          }
          if (res.status === 403) {
            setError("You don’t have access to this journey");
            return;
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load journey");
        }
        const json = (await res.json()) as JourneyData;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load journey");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (!id) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="journey" showNavPanel navSize="large">
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
            {loading ? (
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
                  Loading journey...
                </span>
              </div>
            ) : error ? (
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
            ) : data ? (
              <>
                <HudPanelHeader
                  title={data.journey.name}
                  actions={
                    <Link
                      href="/dashboard"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--dawn-50)",
                        textDecoration: "none",
                      }}
                    >
                      ← dashboard
                    </Link>
                  }
                />
                {data.journey.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      color: "var(--dawn-50)",
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {data.journey.description}
                  </p>
                ) : null}
                {data.journey.routes.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {data.journey.routes.map((route, index) => (
                      <div
                        key={route.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.06}s` }}
                      >
                        <ProjectCard
                          id={route.id}
                          name={route.name}
                          description={route.description ?? "No description"}
                          updatedAt={new Date(route.updatedAt).toLocaleDateString()}
                          waypointCount={route.waypointCount}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <HudEmptyState
                    title="No routes yet"
                    body="Routes in this journey will appear here. Create routes from the dashboard or ask an admin to add them."
                  />
                )}
              </>
            ) : null}
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
