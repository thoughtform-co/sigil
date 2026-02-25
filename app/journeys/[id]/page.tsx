"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RouteCard } from "@/components/journeys/RouteCard";
import { HudPanel, HudPanelHeader, HudEmptyState, HudBreadcrumb } from "@/components/ui/hud";
import { Dialog } from "@/components/ui/Dialog";

type RouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
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
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDescription, setNewRouteDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadJourney = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/journeys/${id}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Journey not found");
          return;
        }
        if (res.status === 403) {
          setError("You don't have access to this journey");
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load journey");
      }
      const json = (await res.json()) as JourneyData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journey");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadJourney();
  }, [loadJourney]);

  async function createRoute() {
    if (!newRouteName.trim() || !id) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRouteName.trim(),
          description: newRouteDescription.trim() || undefined,
          workspaceProjectId: id,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to create route");
      }
      const created = payload.project as { id: string };
      setNewRouteName("");
      setNewRouteDescription("");
      setDialogOpen(false);
      await loadJourney();
      router.push(`/routes/${created.id}/image`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setCreating(false);
    }
  }

  if (!id) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="journey">
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
            {data ? (
              <div style={{ marginBottom: "var(--space-md)" }}>
                <HudBreadcrumb
                  segments={[
                    { label: "journeys", href: "/journeys" },
                    { label: data.journey.name },
                  ]}
                />
              </div>
            ) : null}
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
                    <button
                      type="button"
                      className="sigil-btn-secondary"
                      onClick={() => setDialogOpen(true)}
                    >
                      + create route
                    </button>
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
                        <RouteCard route={route} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <HudEmptyState
                    title="No routes yet"
                    body="Create a route to get started, or ask an admin to add one."
                    action={
                      <button
                        type="button"
                        className="sigil-btn-primary"
                        onClick={() => setDialogOpen(true)}
                      >
                        + create first route
                      </button>
                    }
                  />
                )}
              </>
            ) : null}
          </HudPanel>

          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="create new route"
            footer={
              <>
                <button
                  type="button"
                  className="sigil-btn-ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  cancel
                </button>
                <button
                  type="button"
                  className="sigil-btn-primary"
                  disabled={creating || !newRouteName.trim()}
                  onClick={() => void createRoute()}
                >
                  {creating ? "creating..." : "create"}
                </button>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label
                  htmlFor="journey-dialog-route-name"
                  className="sigil-section-label"
                  style={{ fontSize: "9px", letterSpacing: "0.05em" }}
                >
                  name
                </label>
                <input
                  id="journey-dialog-route-name"
                  type="text"
                  className="sigil-input"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void createRoute();
                    }
                  }}
                  placeholder="Route name"
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label
                  htmlFor="journey-dialog-route-desc"
                  className="sigil-section-label"
                  style={{ fontSize: "9px", letterSpacing: "0.05em" }}
                >
                  description
                </label>
                <textarea
                  id="journey-dialog-route-desc"
                  className="sigil-textarea"
                  value={newRouteDescription}
                  onChange={(e) => setNewRouteDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={4}
                />
              </div>
            </div>
          </Dialog>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
