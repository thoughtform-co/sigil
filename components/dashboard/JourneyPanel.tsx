"use client";

import { useState } from "react";
import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";
import { Dialog } from "@/components/ui/Dialog";
import { Diamond } from "@/components/ui/Diamond";
import { ParticleIcon } from "@/components/ui/ParticleIcon";
import { SectionLabel } from "@/components/ui/SectionLabel";
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
      <h2 style={{ margin: 0 }}>
        <SectionLabel bearing={bearing}>{label}</SectionLabel>
      </h2>
      {action}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7 3L9 5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 3H10M4.5 3V2C4.5 1.45 4.95 1 5.5 1H6.5C7.05 1 7.5 1.45 7.5 2V3M3 3L3.5 10C3.5 10.55 3.95 11 4.5 11H7.5C8.05 11 8.5 10.55 8.5 10L9 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function openDeleteDialog(id: string) {
    setDeleteId(id);
  }

  async function handleDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/workspace-projects/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteId(null);
        onJourneyCreated?.();
      }
    } finally {
      setDeleting(false);
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
              color: "var(--dawn-50)",
            }}
          >
            No journeys assigned
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {journeys.map((journey) => {
              const isSelected = selectedJourneyId === journey.id;
              const isHovered = hoveredId === journey.id;
              const category = journey.type === "learn" ? "learn" : "create";
              const showActions = isAdmin && isHovered;
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
                      flexDirection: "column",
                      width: "100%",
                      padding: "10px 14px 14px",
                      background: isSelected ? "var(--gold-10)" : isHovered ? "var(--dawn-04)" : "var(--surface-0)",
                      border: "1px solid " + (isSelected ? "var(--gold-30, rgba(202,165,84,0.3))" : isHovered ? "var(--dawn-15)" : "var(--dawn-08)"),
                      color: "var(--dawn)",
                      fontFamily: "var(--font-mono)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background 100ms, border-color 100ms",
                    }}
                  >
                    {/* Category row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--dawn-40)",
                        paddingRight: 24,
                      }}
                    >
                      <Diamond active={category === "learn"} size="sm" />
                      {category}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: "1px solid var(--dawn-08)", marginTop: 8, marginBottom: 8 }} />

                    {/* Title row with particle arrow */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: isSelected ? "var(--gold)" : "var(--dawn)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          transition: "color 100ms",
                        }}
                      >
                        {journey.name}
                      </span>
                      <span
                        style={{
                          color: isSelected ? "var(--gold)" : isHovered ? "var(--gold)" : "var(--dawn-50)",
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          transition: "color 100ms",
                        }}
                      >
                        <ParticleIcon glyph="arrow" size="sm" />
                      </span>
                    </div>

                    {/* Stats */}
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: isSelected ? "var(--gold-50, var(--gold))" : "var(--dawn-50)",
                        display: "flex",
                        gap: 10,
                        transition: "color 100ms",
                      }}
                    >
                      <span>{journey.routeCount} routes</span>
                      <span>{journey.generationCount} gen</span>
                    </div>
                  </button>

                  {showActions && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 2,
                      }}
                    >
                      <button
                        type="button"
                        title="Rename journey"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameDialog(journey.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          padding: 0,
                          background: "transparent",
                          border: "none",
                          color: "var(--dawn-30)",
                          cursor: "pointer",
                          transition: "color 80ms ease, background 80ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--dawn)";
                          e.currentTarget.style.background = "var(--dawn-08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--dawn-30)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        title="Delete journey"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(journey.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          padding: 0,
                          background: "transparent",
                          border: "none",
                          color: "var(--dawn-30)",
                          cursor: "pointer",
                          transition: "color 80ms ease, background 80ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--status-error, #c17f59)";
                          e.currentTarget.style.background = "var(--dawn-08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--dawn-30)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
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
          color: "var(--dawn-50)",
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
                  <div style={{ fontSize: "9px", color: "var(--dawn-40)", marginTop: 2 }}>
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

      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="delete journey"
        footer={
          <>
            <button className="sigil-btn-ghost" onClick={() => setDeleteId(null)}>cancel</button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
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
          <strong>{journeys.find((j) => j.id === deleteId)?.name}</strong>?
          This will remove the journey and all member assignments. Routes and
          their generated content will remain accessible.
        </p>
      </Dialog>
    </div>
  );
}
