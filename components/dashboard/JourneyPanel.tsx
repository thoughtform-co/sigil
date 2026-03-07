"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";
import { Dialog } from "@/components/ui/Dialog";
import { JourneyCardCompact } from "@/components/ui/JourneyCardCompact";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardArrowAction } from "@/components/ui/card";

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
  onSelectRoute?: (routeId: string) => void;
  onJourneyCreated?: () => void;
  onJourneyDeleted?: (id: string) => void;
  onJourneyRenamed?: (id: string, name: string) => void;
  adminStats?: AdminStatRow[] | null;
  isAdmin?: boolean;
  action?: React.ReactNode;
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
const WHEEL_COOLDOWN = 70;
const VISIBLE_SLOTS = 5;
const TREE_INDENT = 24;
const TREE_GUTTER = 14;

export function JourneyPanel({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  onSelectRoute,
  onJourneyCreated,
  onJourneyDeleted,
  onJourneyRenamed,
  adminStats,
  isAdmin,
  action: externalAction,
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
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const cardElMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedIdRef = useRef(selectedJourneyId);
  const lastWheelTime = useRef(0);
  const [carouselOffset, setCarouselOffset] = useState(0);

  selectedIdRef.current = selectedJourneyId;
  const selectedIdx = journeys.findIndex((j) => j.id === selectedJourneyId);
  const safeIdx = Math.max(0, selectedIdx);

  const windowStart = journeys.length <= VISIBLE_SLOTS
    ? 0
    : Math.max(0, Math.min(safeIdx - 2, journeys.length - VISIBLE_SLOTS));
  const windowEnd = Math.min(windowStart + VISIBLE_SLOTS, journeys.length);
  const visibleJourneys = journeys.slice(windowStart, windowEnd);
  const slotIdx = safeIdx - windowStart;
  const shouldScrollCards = journeys.length > VISIBLE_SLOTS;

  useEffect(() => {
    if (!shouldScrollCards || visibleJourneys.length <= 1) {
      setCarouselOffset(0);
      return;
    }
    let offset = 0;
    for (let i = 0; i < slotIdx; i++) {
      const el = cardElMap.current.get(visibleJourneys[i]!.id);
      offset += (el?.offsetHeight ?? 90) + CAROUSEL_GAP;
    }
    setCarouselOffset(offset);
  }, [slotIdx, visibleJourneys, shouldScrollCards]);

  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el || journeys.length <= 1) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-route-tree]")) return;
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

  useEffect(() => {
    if (selectedJourneyId) setExpandedJourneyId(selectedJourneyId);
  }, [selectedJourneyId]);

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
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            {externalAction}
            {isAdmin && (
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
            )}
          </div>
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: CAROUSEL_GAP,
                paddingTop: 8,
                paddingBottom: 40,
                transform: shouldScrollCards ? `translateY(-${carouselOffset}px)` : "translateY(0)",
                transition: shouldScrollCards
                  ? "transform 350ms cubic-bezier(0.25, 1, 0.5, 1)"
                  : undefined,
              }}
            >
              {visibleJourneys.map((journey, visIdx) => {
                const actualIdx = windowStart + visIdx;
                const dist = actualIdx - safeIdx;
                const isSelected = dist === 0;
                const isHovered = hoveredId === journey.id;
                const showActions = isAdmin && actionHoverId === journey.id;
                const dimming = isSelected ? 1 : Math.max(0.35, 1 - Math.abs(dist) * 0.2);
                const isExpanded = expandedJourneyId === journey.id && isSelected;

                return (
                  <div
                    key={journey.id}
                    ref={(el) => {
                      if (el) cardElMap.current.set(journey.id, el);
                      else cardElMap.current.delete(journey.id);
                    }}
                    data-journey-selected={isSelected || undefined}
                    style={{
                      position: "relative",
                      opacity: dimming,
                      transition: "opacity 350ms ease",
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
                      onClick={() => onSelectJourney(journey.id)}
                      state={isSelected ? "selected" : "default"}
                      style={isHovered && !isSelected ? { background: "var(--dawn-04)" } : undefined}
                      action={
                        <CardArrowAction
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/journeys/${journey.id}`);
                          }}
                          active={isHovered || isSelected}
                        />
                      }
                      routeTree={
                        isExpanded && journey.routes.length > 0 ? (
                          <div
                            data-route-tree
                            style={{
                              paddingLeft: TREE_INDENT - 12,
                              paddingTop: 6,
                              position: "relative",
                            }}
                          >
                            {journey.routes.map((route, routeIdx) => {
                              const isLastRoute = routeIdx === journey.routes.length - 1;
                              const isRouteHovered = hoveredRouteId === route.id;
                              return (
                                <div
                                  key={route.id}
                                  style={{
                                    position: "relative",
                                    paddingLeft: TREE_GUTTER,
                                    marginBottom: isLastRoute ? 0 : 6,
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={() => setHoveredRouteId(route.id)}
                                  onMouseLeave={() => setHoveredRouteId(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectRoute?.(route.id);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/routes/${route.id}/image`);
                                  }}
                                >
                                  <svg
                                    aria-hidden
                                    width={TREE_GUTTER}
                                    height="20"
                                    viewBox={`0 0 ${TREE_GUTTER} 20`}
                                    fill="none"
                                    style={{ position: "absolute", left: 0, top: -2 }}
                                  >
                                    <path
                                      d={`M0 0V10H${TREE_GUTTER - 1}`}
                                      stroke="var(--dawn-15)"
                                      strokeWidth="1"
                                      strokeLinecap="square"
                                      strokeLinejoin="miter"
                                      vectorEffect="non-scaling-stroke"
                                    />
                                  </svg>
                                  {!isLastRoute && (
                                    <div
                                      aria-hidden
                                      style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 10,
                                        bottom: -6,
                                        width: 1,
                                        background: "var(--dawn-15)",
                                      }}
                                    />
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 6,
                                      paddingBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "10px",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: isRouteHovered ? "var(--dawn)" : "var(--dawn-50)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        transition: "color 100ms",
                                      }}
                                    >
                                      {route.name}
                                    </span>
                                    <CardArrowAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/routes/${route.id}/image`);
                                      }}
                                      active={isRouteHovered}
                                      size="sm"
                                      style={{ opacity: isRouteHovered ? 1 : 0 }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : undefined
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
