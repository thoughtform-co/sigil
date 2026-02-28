"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { JourneyCard, type JourneyCardItem } from "@/components/journeys/JourneyCard";
import { Dialog } from "@/components/ui/Dialog";
import { HudPanel, HudPanelHeader, HudEmptyState } from "@/components/ui/hud";

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
            top: "14px",
            right: "12px",
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
            top: "38px",
            right: "12px",
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
  const [createOpen, setCreateOpen] = useState(false);
  const [newJourneyName, setNewJourneyName] = useState("");
  const [newJourneyDescription, setNewJourneyDescription] = useState("");
  const [newJourneyType, setNewJourneyType] = useState<"learn" | "create">("create");
  const [creating, setCreating] = useState(false);

  async function loadJourneys() {
    try {
      setError(null);
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

  useEffect(() => {
    void loadJourneys();
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

  async function createJourney() {
    if (!newJourneyName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/workspace-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newJourneyName.trim(),
          description: newJourneyDescription.trim() || undefined,
          type: newJourneyType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create journey");
      }
      setCreateOpen(false);
      setNewJourneyName("");
      setNewJourneyDescription("");
      setNewJourneyType("create");
      setLoading(true);
      await loadJourneys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create journey");
    } finally {
      setCreating(false);
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
            <HudPanelHeader
              title="Journeys"
              inlineActions={
                isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    title="Create journey"
                    aria-label="Create journey"
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
                      transition: "color 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--gold)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--dawn-30)";
                    }}
                  >
                    +
                  </button>
                ) : null
              }
            />
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
                    color: "var(--dawn-50)",
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
                    disabled={deleting}
                    onClick={() => void deleteJourney()}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      border: "1px solid var(--gold)",
                      color: "var(--gold)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: deleting ? "not-allowed" : "pointer",
                      opacity: deleting ? 0.4 : 1,
                      transition: "background 120ms, color 120ms",
                    }}
                    onMouseEnter={(e) => {
                      if (!deleting) {
                        e.currentTarget.style.background = "var(--gold)";
                        e.currentTarget.style.color = "var(--void)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--gold)";
                    }}
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
            <Dialog
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              title="create new journey"
              footer={
                <>
                  <button
                    type="button"
                    className="sigil-btn-ghost"
                    onClick={() => setCreateOpen(false)}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    className="sigil-btn-primary"
                    disabled={creating || !newJourneyName.trim()}
                    onClick={() => void createJourney()}
                  >
                    {creating ? "creating..." : "create"}
                  </button>
                </>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <div>
                  <label
                    htmlFor="journey-overview-name"
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--dawn-40)",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    Name
                  </label>
                  <input
                    id="journey-overview-name"
                    type="text"
                    value={newJourneyName}
                    onChange={(e) => setNewJourneyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createJourney();
                    }}
                    placeholder="e.g. Visual AI Workshop Two"
                    autoFocus
                    className="admin-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="journey-overview-description"
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--dawn-40)",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    Description (optional)
                  </label>
                  <input
                    id="journey-overview-description"
                    type="text"
                    value={newJourneyDescription}
                    onChange={(e) => setNewJourneyDescription(e.target.value)}
                    placeholder="Brief description"
                    className="admin-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--dawn-40)",
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    Type
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["create", "learn"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewJourneyType(t)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: newJourneyType === t ? (t === "learn" ? "var(--gold-10)" : "var(--dawn-04)") : "transparent",
                          border: `1px solid ${newJourneyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn-15)") : "var(--dawn-08)"}`,
                          borderLeft: `2px solid ${newJourneyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn-30)") : "var(--dawn-08)"}`,
                          color: newJourneyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn)") : "var(--dawn-40)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          transition: "all 120ms",
                          textAlign: "left",
                        }}
                      >
                        <div>{t === "create" ? "Create" : "Learn"}</div>
                        <div style={{ fontSize: "9px", color: "var(--dawn-40)", marginTop: 2 }}>
                          {t === "create" ? "Direct image/video generation" : "Workshop with lessons"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Dialog>
          </HudPanel>
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
