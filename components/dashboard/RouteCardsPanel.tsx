"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RouteCard } from "./RouteCard";
import type { DashboardRouteItem } from "./DashboardView";

const ROUTE_CARDS_STACK_MQ = "(max-width: 1320px)";

function useRouteCardsStackVertically() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(ROUTE_CARDS_STACK_MQ);
      const listener = () => {
        onStoreChange();
      };
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    },
    () => window.matchMedia(ROUTE_CARDS_STACK_MQ).matches,
    () => false,
  );
}

type RouteCardsPanelProps = {
  routes: DashboardRouteItem[];
  journeyId: string | null;
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string) => void;
  onRouteCreated: () => void;
  onRouteDeleted?: (routeId: string) => void;
  onRouteRenamed?: (routeId: string, name: string) => void;
};

export function RouteCardsPanel({ routes, journeyId, selectedRouteId: controlledRouteId, onSelectRoute, onRouteCreated, onRouteDeleted, onRouteRenamed }: RouteCardsPanelProps) {
  const router = useRouter();
  const stackVertically = useRouteCardsStackVertically();
  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);
  const isControlled = controlledRouteId !== undefined;
  const focusedRouteId = isControlled ? controlledRouteId : internalFocusId;
  const setFocusedRouteId = (id: string | null) => {
    if (id && onSelectRoute) onSelectRoute(id);
    if (!isControlled) setInternalFocusId(id);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (routes.length === 0) {
      if (!isControlled) setInternalFocusId(null);
      return;
    }
    if (focusedRouteId && routes.some((r) => r.id === focusedRouteId)) return;
    const first = routes[0]!.id;
    if (onSelectRoute) onSelectRoute(first);
    if (!isControlled) setInternalFocusId(first);
  }, [routes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusedRouteId) return;
    router.prefetch(`/routes/${focusedRouteId}/image`);
  }, [focusedRouteId, router]);

  function openRenameDialog(id: string) {
    const route = routes.find((r) => r.id === id);
    if (!route) return;
    setRenameId(id);
    setRenameName(route.name);
  }

  async function handleRename() {
    if (!renameId || !renameName.trim() || renaming) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/projects/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (res.ok) {
        const savedId = renameId;
        const savedName = renameName.trim();
        setRenameId(null);
        setRenameName("");
        onRouteRenamed?.(savedId, savedName);
      }
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        const savedId = deleteId;
        setDeleteId(null);
        if (focusedRouteId === savedId) {
          const remaining = routes.filter((r) => r.id !== savedId);
          setFocusedRouteId(remaining[0]?.id ?? null);
        }
        onRouteDeleted?.(savedId);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || creating || !journeyId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          workspaceProjectId: journeyId,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setName("");
        setDescription("");
        onRouteCreated();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        paddingLeft: "clamp(4px, 1vw, var(--space-sm))",
        paddingRight: "clamp(var(--space-sm), 1.5vw, var(--space-md))",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "var(--space-sm)",
          top: 38,
          bottom: 0,
          width: 1,
          background: "var(--dawn-15)",
          pointerEvents: "none",
        }}
      />
      <SectionHeader
        label="ROUTES"
        action={
          journeyId ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              title="Create route"
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
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
          paddingTop: "15px",
        }}
      >
        {routes.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--dawn-50)",
              textAlign: "center",
              padding: "var(--space-xl)",
              width: "100%",
            }}
          >
            No routes in this journey
          </p>
        ) : (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              paddingLeft: 22,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <svg
              aria-hidden
              width="20"
              height="24"
              viewBox="0 0 20 24"
              fill="none"
              style={{ position: "absolute", left: 0, top: 53 }}
            >
              <path d="M0 0V11H19" stroke="var(--dawn-15)" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
            </svg>
            <div
              className="route-cards-inner-grid"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                alignContent: "flex-start",
                gap: "var(--route-cards-gap, var(--space-xl))",
                padding:
                  "0 var(--route-cards-pad-x, var(--space-xl)) var(--route-cards-pad-bottom, var(--space-xl))",
                minWidth: 0,
              }}
            >
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isActive={focusedRouteId === route.id}
                  stackVertically={stackVertically}
                  onSelect={() => setFocusedRouteId(route.id)}
                  onNavigate={() => router.push(`/routes/${route.id}/image`)}
                  onRename={() => openRenameDialog(route.id)}
                  onDelete={() => setDeleteId(route.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="create new route"
        footer={
          <>
            <button className="sigil-btn-ghost" onClick={() => setDialogOpen(false)}>
              cancel
            </button>
            <button className="sigil-btn-primary" disabled={creating || !name.trim()} onClick={() => void handleCreate()}>
              {creating ? "creating..." : "create"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div>
            <label
              htmlFor="route-name"
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
              id="route-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="e.g. Brand Campaign Q2"
              autoFocus
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              htmlFor="route-desc"
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
              id="route-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={renameId !== null}
        onClose={() => { setRenameId(null); setRenameName(""); }}
        title="rename route"
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
            htmlFor="rename-route"
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
            id="rename-route"
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
        title="delete route"
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
          <strong>{routes.find((r) => r.id === deleteId)?.name}</strong>?
          This will permanently remove the route and all its waypoints and generations.
        </p>
      </Dialog>
    </div>
  );
}
