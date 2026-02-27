"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { JourneyCard, type JourneyCardItem } from "@/components/journeys/JourneyCard";
import { Dialog } from "@/components/ui/Dialog";
import { HudPanel, HudPanelHeader, HudEmptyState, HudBreadcrumb } from "@/components/ui/hud";

type JourneysListData = {
  journeys: JourneyCardItem[];
};

function JourneyCardWithMenu({
  journey,
  index,
  isAdmin,
  onDelete,
}: {
  journey: JourneyCardItem;
  index: number;
  isAdmin: boolean;
  onDelete: (j: JourneyCardItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      className="animate-fade-in-up relative"
      style={{ animationDelay: `${index * 0.06}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      <JourneyCard journey={journey} />
      {isAdmin && (hovered || menuOpen) && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: menuOpen ? "var(--dawn-08)" : "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            zIndex: 3,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="2" height="2" fill="currentColor" style={{ color: "var(--dawn-40)" }} />
            <rect x="6" y="6" width="2" height="2" fill="currentColor" style={{ color: "var(--dawn-40)" }} />
            <rect x="10" y="6" width="2" height="2" fill="currentColor" style={{ color: "var(--dawn-40)" }} />
          </svg>
        </button>
      )}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "34px",
            right: "10px",
            background: "var(--void)",
            border: "1px solid var(--dawn-15)",
            zIndex: 50,
            minWidth: 120,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              onDelete(journey);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "var(--dawn-70)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              textAlign: "left",
              cursor: "pointer",
              transition: "background 80ms, color 80ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--dawn-08)";
              e.currentTarget.style.color = "var(--status-error, #ff6b35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--dawn-70)";
            }}
          >
            DELETE
          </button>
        </div>
      )}
    </div>
  );
}

export default function JourneysOverviewPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<JourneysListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JourneyCardItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function deleteJourney() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/workspace-projects/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete journey");
      }
      setData((prev) =>
        prev ? { journeys: prev.journeys.filter((j) => j.id !== deleteTarget.id) } : prev,
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete journey");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="journeys">
        <section
          className="w-full max-w-[960px] animate-fade-in-up"
          style={{ paddingTop: "var(--space-2xl)" }}
        >
          <HudPanel>
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
                  <JourneyCardWithMenu
                    key={journey.id}
                    journey={journey}
                    index={index}
                    isAdmin={isAdmin}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : data ? (
              <HudEmptyState
                title="No journeys yet"
                body="Journeys you're assigned to will appear here. Ask an admin to add you to a journey."
              />
            ) : null}

            <Dialog
              open={!!deleteTarget}
              onClose={() => setDeleteTarget(null)}
              title="delete journey"
              footer={
                <>
                  <button
                    type="button"
                    className="sigil-btn-ghost"
                    onClick={() => setDeleteTarget(null)}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    className="sigil-btn-primary"
                    disabled={deleting}
                    onClick={() => void deleteJourney()}
                    style={{ color: "var(--status-error)" }}
                  >
                    {deleting ? "deleting..." : "delete permanently"}
                  </button>
                </>
              }
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "var(--dawn-70)",
                  lineHeight: 1.6,
                }}
              >
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.name}</strong>? This will remove the
                journey and all member assignments. Routes and their generated
                content will remain accessible.
              </p>
            </Dialog>
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
