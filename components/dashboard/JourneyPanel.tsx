"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";
import { Dialog } from "@/components/ui/Dialog";
import { JourneyCardCompact } from "@/components/ui/JourneyCardCompact";
import { SectionHeader } from "@/components/ui/SectionHeader";

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
  onJourneyDeleted?: (id: string) => void;
  onJourneyRenamed?: (id: string, name: string) => void;
  adminStats?: AdminStatRow[] | null;
  isAdmin?: boolean;
};

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

const CAROUSEL_GAP = 8;
const WHEEL_COOLDOWN = 250;

export function JourneyPanel({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  onJourneyCreated,
  onJourneyDeleted,
  onJourneyRenamed,
  adminStats,
  isAdmin,
}: JourneyPanelProps) {
  const router = useRouter();
  const totalGenerations = journeys.reduce((sum, j) => sum + j.generationCount, 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [journeyType, setJourneyType] = useState<"learn" | "create">("create");
  const [creating, setCreating] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [actionHoverId, setActionHoverId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const cardElMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedIdRef = useRef(selectedJourneyId);
  const lastWheelTime = useRef(0);
  const [carouselOffset, setCarouselOffset] = useState(0);

  selectedIdRef.current = selectedJourneyId;
  const selectedIdx = journeys.findIndex((j) => j.id === selectedJourneyId);

  useEffect(() => {
    if (selectedIdx <= 0) { setCarouselOffset(0); return; }
    let offset = 0;
    for (let i = 0; i < selectedIdx; i++) {
      const el = cardElMap.current.get(journeys[i]!.id);
      offset += (el?.offsetHeight ?? 90) + CAROUSEL_GAP;
    }
    setCarouselOffset(offset);
  }, [selectedIdx, journeys]);

  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el || journeys.length <= 1) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < WHEEL_COOLDOWN) return;
      if (Math.abs(e.deltaY) < 5) return;
      lastWheelTime.current = now;
      const dir = e.deltaY > 0 ? 1 : -1;
      const curIdx = journeys.findIndex((j) => j.id === selectedIdRef.current);
      const nextIdx = Math.max(0, Math.min(journeys.length - 1, curIdx + dir));
      if (nextIdx !== curIdx) onSelectJourney(journeys[nextIdx]!.id);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [journeys, onSelectJourney]);

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
        const savedId = renameId;
        const savedName = renameName.trim();
        setRenameId(null);
        setRenameName("");
        onJourneyRenamed?.(savedId, savedName);
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
        const savedId = deleteId;
        setDeleteId(null);
        onJourneyDeleted?.(savedId);
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
        paddingRight: "var(--space-md)",
      }}
    >
      <SectionHeader
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

      <div
        ref={wheelContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          cursor: journeys.length > 1 ? "ns-resize" : undefined,
        }}
      >
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
          <>
            {/* Fixed selection rail */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: "var(--dawn-08)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
            {/* Gold active-slot indicator */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 8,
                width: 2,
                height: 24,
                background: "var(--gold)",
                zIndex: 2,
                pointerEvents: "none",
                transition: "opacity var(--duration-base)",
              }}
            />

            {/* Sliding card stack */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: CAROUSEL_GAP,
                paddingLeft: 10,
                paddingTop: 8,
                paddingBottom: 40,
                transform: `translateY(-${carouselOffset}px)`,
                transition: "transform 300ms cubic-bezier(0.19, 1, 0.22, 1)",
              }}
            >
              {journeys.map((journey, idx) => {
                const dist = idx - selectedIdx;
                const isSelected = dist === 0;
                const isHovered = hoveredId === journey.id;
                const showActions = isAdmin && actionHoverId === journey.id;
                const dimming = isSelected ? 1 : Math.max(0.35, 1 - Math.abs(dist) * 0.2);

                return (
                  <div
                    key={journey.id}
                    ref={(el) => {
                      if (el) cardElMap.current.set(journey.id, el);
                      else cardElMap.current.delete(journey.id);
                    }}
                    style={{
                      position: "relative",
                      opacity: dimming,
                      transition: "opacity 300ms ease",
                    }}
                    onMouseEnter={() => setHoveredId(journey.id)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      if (y <= 34) setActionHoverId(journey.id);
                      else if (actionHoverId === journey.id) setActionHoverId(null);
                    }}
                    onMouseLeave={() => {
                      setHoveredId(null);
                      if (actionHoverId === journey.id) setActionHoverId(null);
                    }}
                  >
                    <JourneyCardCompact
                      name={journey.name}
                      type={journey.type === "learn" ? "learn" : "create"}
                      routeCount={journey.routeCount}
                      generationCount={journey.generationCount}
                      onClick={() => onSelectJourney(journey.id)}
                      selected={isSelected}
                      style={isHovered && !isSelected ? { background: "var(--dawn-04)" } : undefined}
                      action={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/journeys/${journey.id}`);
                          }}
                          style={{
                            color: "var(--gold)",
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            lineHeight: 1.2,
                            cursor: "pointer",
                            transition: "opacity 100ms",
                            opacity: isHovered || isSelected ? 1 : 0.75,
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 5,
                              height: 5,
                              background: "currentColor",
                              transform: "rotate(45deg)",
                              display: "inline-block",
                            }}
                          />
                          Open
                        </button>
                      }
                    />

                    {showActions && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          display: "flex",
                          gap: 2,
                        }}
                        onMouseEnter={() => setActionHoverId(journey.id)}
                        onMouseLeave={() => setActionHoverId(null)}
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

            {/* Position indicator */}
            {journeys.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 10,
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  letterSpacing: "0.1em",
                  color: "var(--dawn-30)",
                  fontVariantNumeric: "tabular-nums",
                  pointerEvents: "none",
                }}
              >
                {String(selectedIdx + 1).padStart(2, "0")}/{String(journeys.length).padStart(2, "0")}
              </div>
            )}
          </>
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
