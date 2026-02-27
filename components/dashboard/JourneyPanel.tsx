"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";
import { Dialog } from "@/components/ui/Dialog";
import type { ReactNode } from "react";

export type JourneyPanelRoute = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  generationCount: number;
  thumbnails: { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[];
};

export type JourneyPanelItem = {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: JourneyPanelRoute[];
};

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

type JourneyPanelProps = {
  journeys: JourneyPanelItem[];
  selectedJourneyId: string | null;
  onSelectJourney: (id: string) => void;
  onJourneyCreated?: () => void;
  adminStats?: AdminStatRow[] | null;
  isAdmin?: boolean;
};

function Diamond({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        background: active ? "var(--gold)" : "var(--dawn-30)",
        transform: "rotate(45deg)",
        flexShrink: 0,
      }}
    />
  );
}

function SectionHeader({ bearing, label, action }: { bearing: string; label: string; action?: ReactNode }) {
  return (
    <div
      style={{
        paddingBottom: "var(--space-sm)",
        borderBottom: "1px solid var(--dawn-08)",
        marginBottom: "var(--space-md)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <h2 className="sigil-section-label" style={{ margin: 0 }}>
        <span style={{ color: "var(--dawn-30)", marginRight: "var(--space-xs)" }}>{bearing}</span>
        {label}
      </h2>
      {action}
    </div>
  );
}

function ThreeDotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function JourneyMenu({
  journeyId,
  onRename,
  onClose,
}: {
  journeyId: string;
  onRename: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: 0,
        top: "100%",
        marginTop: 4,
        background: "var(--void)",
        border: "1px solid var(--dawn-15)",
        zIndex: 50,
        minWidth: 120,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRename(journeyId);
          onClose();
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
          transition: "background 80ms ease, color 80ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--dawn-08)";
          e.currentTarget.style.color = "var(--dawn)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--dawn-70)";
        }}
      >
        rename
      </button>
    </div>
  );
}

export function JourneyPanel({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  onJourneyCreated,
  adminStats,
  isAdmin,
}: JourneyPanelProps) {
  const totalGenerations = journeys.reduce((sum, j) => sum + j.generationCount, 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [journeyType, setJourneyType] = useState<"learn" | "create">("create");
  const [creating, setCreating] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const closeMenu = useCallback(() => setMenuOpenId(null), []);

  function openRenameDialog(id: string) {
    const journey = journeys.find((j) => j.id === id);
    if (!journey) return;
    setRenameId(id);
    setRenameName(journey.name);
  }

  async function handleRename() {
    if (!renameId || !renameName.trim() || renaming) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/admin/workspace-projects/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (res.ok) {
        setRenameId(null);
        setRenameName("");
        onJourneyCreated?.();
      }
    } finally {
      setRenaming(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/workspace-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, type: journeyType }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setName("");
        setDescription("");
        setJourneyType("create");
        onJourneyCreated?.();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
      }}
    >
      <SectionHeader
        bearing="01"
        label="JOURNEYS"
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-30)";
              }}
            >
              +
            </button>
          ) : undefined
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {journeys.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--dawn-30)",
            }}
          >
            No journeys assigned
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {journeys.map((journey) => {
              const isSelected = selectedJourneyId === journey.id;
              const isHovered = hoveredId === journey.id;
              const showDots = isAdmin && (isHovered || menuOpenId === journey.id);
              return (
                <div
                  key={journey.id}
                  style={{ position: "relative" }}
                  onMouseEnter={() => setHoveredId(journey.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    type="button"
                    onClick={() => onSelectJourney(journey.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      width: "100%",
                      padding: "10px var(--space-md)",
                      background: isSelected ? "var(--gold-10)" : isHovered ? "var(--dawn-04)" : "transparent",
                      border: "1px solid " + (isSelected ? "var(--gold-30, rgba(202,165,84,0.3))" : isHovered ? "var(--dawn-15)" : "var(--dawn-08)"),
                      borderLeft: "2px solid " + (isSelected ? "var(--gold)" : isHovered ? "var(--dawn-15)" : "var(--dawn-08)"),
                      color: isSelected ? "var(--gold)" : isHovered ? "var(--dawn)" : "var(--dawn-50)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "color 100ms, background 100ms, border-color 100ms",
                    }}
                  >
                    <span style={{ marginTop: 4 }}>
                      <Diamond active={isSelected} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {journey.name}
                        {journey.type === "learn" && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "8px",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--gold)",
                              border: "1px solid var(--gold-15)",
                              padding: "1px 4px",
                              flexShrink: 0,
                            }}
                          >
                            learn
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.04em",
                          color: isSelected ? "var(--gold-50, var(--gold))" : "var(--dawn-30)",
                          marginTop: 3,
                          display: "flex",
                          gap: 10,
                        }}
                      >
                        <span>{journey.routeCount} routes</span>
                        <span>{journey.generationCount} gen</span>
                      </div>
                    </div>
                    {showDots && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === journey.id ? null : journey.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          padding: 0,
                          marginTop: 1,
                          background: menuOpenId === journey.id ? "var(--dawn-08)" : "transparent",
                          border: "1px solid transparent",
                          color: "var(--dawn-40)",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "color 80ms ease, background 80ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--dawn)";
                          e.currentTarget.style.borderColor = "var(--dawn-15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--dawn-40)";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        <ThreeDotIcon />
                      </button>
                    )}
                  </button>
                  {menuOpenId === journey.id && (
                    <JourneyMenu
                      journeyId={journey.id}
                      onRename={openRenameDialog}
                      onClose={closeMenu}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--dawn-08)",
          paddingTop: "var(--space-sm)",
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
          paddingBottom: "var(--space-md)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.06em",
          color: "var(--dawn-30)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{journeys.length} journeys</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{totalGenerations} generations</span>
        </div>
        {isAdmin && adminStats && adminStats.length > 0 && (
          <div style={{ marginTop: "var(--space-xs)" }}>
            <AdminStatsPanel stats={adminStats} />
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="create new journey"
        footer={
          <>
            <button className="sigil-btn-ghost" onClick={() => setDialogOpen(false)}>cancel</button>
            <button
              className="sigil-btn-primary"
              disabled={creating || !name.trim()}
              onClick={() => void handleCreate()}
            >
              {creating ? "creating..." : "create"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div>
            <label
              htmlFor="journey-name"
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
              id="journey-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
              placeholder="e.g. Visual AI Workshop Two"
              autoFocus
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              htmlFor="journey-desc"
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
              id="journey-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  onClick={() => setJourneyType(t)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: journeyType === t ? (t === "learn" ? "var(--gold-10)" : "var(--dawn-04)") : "transparent",
                    border: `1px solid ${journeyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn-15)") : "var(--dawn-08)"}`,
                    borderLeft: `2px solid ${journeyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn-30)") : "var(--dawn-08)"}`,
                    color: journeyType === t ? (t === "learn" ? "var(--gold)" : "var(--dawn)") : "var(--dawn-40)",
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
                  <div style={{ fontSize: "9px", color: "var(--dawn-30)", marginTop: 2 }}>
                    {t === "create" ? "Direct image/video generation" : "Workshop with lessons"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={renameId !== null}
        onClose={() => { setRenameId(null); setRenameName(""); }}
        title="rename journey"
        footer={
          <>
            <button className="sigil-btn-ghost" onClick={() => { setRenameId(null); setRenameName(""); }}>cancel</button>
            <button
              className="sigil-btn-primary"
              disabled={renaming || !renameName.trim()}
              onClick={() => void handleRename()}
            >
              {renaming ? "saving..." : "save"}
            </button>
          </>
        }
      >
        <div>
          <label
            htmlFor="rename-journey"
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
            id="rename-journey"
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
            autoFocus
            className="admin-input"
            style={{ width: "100%" }}
          />
        </div>
      </Dialog>
    </div>
  );
}
