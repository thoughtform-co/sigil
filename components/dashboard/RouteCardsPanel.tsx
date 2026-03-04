"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RouteCard } from "./RouteCard";
import type { DashboardRouteItem } from "./DashboardView";

type RouteCardsPanelProps = {
  routes: DashboardRouteItem[];
  journeyId: string | null;
  onRouteCreated: () => void;
  onRouteDeleted?: (routeId: string) => void;
  onRouteRenamed?: (routeId: string, name: string) => void;
};

export function RouteCardsPanel({ routes, journeyId, onRouteCreated, onRouteDeleted, onRouteRenamed }: RouteCardsPanelProps) {
  const router = useRouter();
  const [focusedRouteId, setFocusedRouteId] = useState<string | null>(null);

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
    setFocusedRouteId((prev) => {
      if (routes.length === 0) return null;
      if (prev && routes.some((r) => r.id === prev)) return prev;
      return routes[0]!.id;
    });
  }, [routes]);

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
        bearing="02"
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

      {/* Open journey link */}
      {journeyId && (
        <Link
          href={`/journeys/${journeyId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px var(--space-md)",
            marginBottom: "var(--space-md)",
            border: "1px solid var(--dawn-08)",
            textDecoration: "none",
            color: "var(--dawn-50)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transition: "border-color 120ms, color 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--gold-15)";
            e.currentTarget.style.color = "var(--gold)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--dawn-08)";
            e.currentTarget.style.color = "var(--dawn-50)";
          }}
        >
          <span style={{ width: 6, height: 6, background: "var(--gold)", transform: "rotate(45deg)", flexShrink: 0 }} />
          Open journey &rarr;
        </Link>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
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
              width: "100%",
              overflowX: "auto",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "var(--space-xl)",
                padding: "var(--space-2xl) var(--space-xl)",
                flexShrink: 0,
              }}
            >
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isActive={focusedRouteId === route.id}
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
