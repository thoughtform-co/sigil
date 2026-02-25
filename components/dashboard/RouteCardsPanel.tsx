"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { RouteCard } from "./RouteCard";
import type { DashboardRouteItem } from "./DashboardView";
import type { ReactNode } from "react";

type RouteCardsPanelProps = {
  routes: DashboardRouteItem[];
  journeyId: string | null;
  onRouteCreated: () => void;
};

function SectionHeader({ bearing, label, action }: { bearing: string; label: string; action?: ReactNode }) {
  return (
    <div
      style={{
        paddingBottom: "var(--space-sm)",
        borderBottom: "1px solid var(--dawn-08)",
        marginBottom: "var(--space-lg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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

export function RouteCardsPanel({ routes, journeyId, onRouteCreated }: RouteCardsPanelProps) {
  const router = useRouter();
  const [focusedRouteId, setFocusedRouteId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

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
    void fetch(`/api/generations?projectId=${focusedRouteId}`).catch(() => {});
    void fetch(`/api/sessions?projectId=${focusedRouteId}`).catch(() => {});
  }, [focusedRouteId, router]);

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
                border: "1px solid var(--dawn-15)",
                color: "var(--dawn-30)",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                lineHeight: 1,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.color = "var(--gold)";
                e.currentTarget.style.background = "rgba(202, 165, 84, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--dawn-15)";
                e.currentTarget.style.color = "var(--dawn-30)";
                e.currentTarget.style.background = "transparent";
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
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {routes.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--dawn-30)",
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
    </div>
  );
}
