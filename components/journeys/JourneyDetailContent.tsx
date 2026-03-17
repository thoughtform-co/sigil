"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { getJourneyContentByWorkspaceId } from "@/lib/learning";
import type { JourneyMode } from "@/lib/terminology";
import type { JourneyDetailData } from "@/lib/prefetch/journeys";

const JourneyShell = dynamic(
  () => import("@/components/learning/JourneyShell").then((m) => m.JourneyShell),
  { ssr: false },
);

const BrandedJourneyHub = dynamic(
  () => import("@/components/workshops/BrandedJourneyHub").then((m) => m.BrandedJourneyHub),
  { ssr: false },
);

export function JourneyDetailContent({
  id,
  initialData,
  initialIsAdmin,
}: {
  id: string;
  initialData?: JourneyDetailData;
  initialIsAdmin?: boolean;
}) {
  const router = useRouter();
  const mountMarked = useRef(false);
  if (!mountMarked.current) {
    mountMarked.current = true;
    if (typeof performance !== "undefined") performance.mark("sigil:journey-mount");
  }

  const [data, setData] = useState<JourneyDetailData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDescription, setNewRouteDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localType, setLocalType] = useState<JourneyMode>(
    (initialData?.journey.type as JourneyMode) ?? "create",
  );

  const skipInitialFetch = useRef(!!initialData);

  const loadJourney = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/journeys/${id}`);
      if (!res.ok) {
        if (res.status === 404) { setError("Journey not found"); return; }
        if (res.status === 403) { setError("You don't have access to this journey"); return; }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load journey");
      }
      const json = (await res.json()) as JourneyDetailData;
      setData(json);
      setLocalType((json.journey.type as JourneyMode) ?? "create");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journey");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    setLoading(true);
    void loadJourney();
  }, [loadJourney]);

  const dataReadyMarked = useRef(false);
  useEffect(() => {
    if (!dataReadyMarked.current && data) {
      dataReadyMarked.current = true;
      performance.mark("sigil:journey-data-ready");
      if (performance.getEntriesByName("sigil:journey-mount").length > 0) {
        performance.measure("sigil:journey-ttdr", "sigil:journey-mount", "sigil:journey-data-ready");
      }
    }
  }, [data]);

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
      if (!res.ok) throw new Error(payload.error ?? "Failed to create route");
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

  async function upgradeToLearn() {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/workspace-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "learn" }),
      });
      if (res.ok) {
        setLocalType("learn");
      }
    } catch {
      // silently fail -- admin can retry
    }
  }

  const journeyType = localType;
  const isBranded = journeyType === "branded";
  const learningContent = journeyType === "learn" ? getJourneyContentByWorkspaceId(id) : null;

  if (isBranded && data) {
    return (
      <BrandedJourneyHub
        journeyId={id}
        journeyName={data.journey.name}
        journeyDescription={data.journey.description}
        rawSettings={data.journey.settings}
      />
    );
  }

  return (
    <section
      className="w-full animate-fade-in-up"
      style={{ paddingTop: "var(--space-2xl)", maxWidth: "var(--layout-content-md, 1200px)", margin: "0 auto" }}
    >
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
          <JourneyShell
            journeyId={id}
            journeyName={data.journey.name}
            journeyDescription={data.journey.description}
            journeyType={journeyType}
            routes={data.journey.routes}
            learningContent={learningContent}
            onCreateRoute={() => setDialogOpen(true)}
            onUpgradeToLearn={upgradeToLearn}
          />
        </>
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="create new route"
        footer={
          <>
            <button type="button" className="sigil-btn-ghost" onClick={() => setDialogOpen(false)}>cancel</button>
            <button type="button" className="sigil-btn-primary" disabled={creating || !newRouteName.trim()} onClick={() => void createRoute()}>
              {creating ? "creating..." : "create"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="journey-dialog-route-name" className="sigil-section-label" style={{ fontSize: "9px", letterSpacing: "0.05em" }}>name</label>
            <input id="journey-dialog-route-name" type="text" className="sigil-input" value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createRoute(); } }} placeholder="Route name" autoFocus />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="journey-dialog-route-desc" className="sigil-section-label" style={{ fontSize: "9px", letterSpacing: "0.05em" }}>description</label>
            <textarea id="journey-dialog-route-desc" className="sigil-textarea" value={newRouteDescription} onChange={(e) => setNewRouteDescription(e.target.value)} placeholder="Optional description..." rows={4} />
          </div>
        </div>
      </Dialog>
    </section>
  );
}
