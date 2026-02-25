"use client";

import { useEffect, useState } from "react";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { JourneyCard, type JourneyCardItem } from "@/components/journeys/JourneyCard";
import { HudPanel, HudPanelHeader, HudEmptyState, HudBreadcrumb } from "@/components/ui/hud";

type JourneysListData = {
  journeys: JourneyCardItem[];
};

export default function JourneysOverviewPage() {
  const [data, setData] = useState<JourneysListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/journeys", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load journeys");
        }
        const json = (await res.json()) as JourneysListData;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load journeys");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="journeys">
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
            <div style={{ marginBottom: "var(--space-md)" }}>
              <HudBreadcrumb segments={[{ label: "journeys" }]} />
            </div>
            <HudPanelHeader title="Journeys" />
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
                  Loading journeys...
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
            ) : data && data.journeys.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.journeys.map((journey, index) => (
                  <div
                    key={journey.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    <JourneyCard journey={journey} />
                  </div>
                ))}
              </div>
            ) : data ? (
              <HudEmptyState
                title="No journeys yet"
                body="Journeys you’re assigned to will appear here. Ask an admin to add you to a journey."
              />
            ) : null}
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
