"use client";

import { useEffect, useState, useCallback } from "react";

type FailedGeneration = {
  id: string;
  modelId: string;
  prompt: string;
  status: string;
  createdAt: string;
  errorMessage: string | null;
  errorCategory: string | null;
  errorRetryable: boolean | null;
  lastHeartbeatAt: string | null;
  session: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
};

function statusBadge(status: string): { label: string; color: string } {
  if (status === "failed") return { label: "FAILED", color: "var(--status-error)" };
  if (status === "processing" || status === "processing_locked") return { label: "STUCK", color: "var(--gold)" };
  return { label: status.toUpperCase(), color: "var(--dawn-40)" };
}

export function FailedGenerationsPanel() {
  const [items, setItems] = useState<FailedGeneration[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/admin/failed-generations", { cache: "no-store" });
    const data = (await response.json()) as { generations?: FailedGeneration[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Failed to load");
    setItems(data.generations ?? []);
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load");
    });
  }, [load]);

  async function retry(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/failed-generations/${id}/retry`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Retry failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusyId(null);
    }
  }

  async function cleanupStuck() {
    setCleaning(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cleanup-stuck-generations", { method: "POST" });
      const data = (await response.json()) as { cleaned?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Cleanup failed");
      if (data.cleaned === 0) {
        setError("No stuck generations found.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }

  const stuckCount = items.filter((i) => i.status === "processing" || i.status === "processing_locked").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="admin-section">
      <div className="admin-section-title">
        Failed & Stuck Generations
        {(failedCount > 0 || stuckCount > 0) && (
          <span style={{ fontWeight: 400, color: "var(--dawn-40)", marginLeft: "var(--space-sm)" }}>
            {failedCount} failed{stuckCount > 0 ? ` / ${stuckCount} stuck` : ""}
          </span>
        )}
      </div>
      <div className="admin-section-body">
        {error && (
          <p style={{ marginBottom: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-error)" }} role="alert">
            {error}
          </p>
        )}

        {stuckCount > 0 && (
          <div style={{ marginBottom: "var(--space-md)" }}>
            <button
              type="button"
              onClick={() => void cleanupStuck()}
              disabled={cleaning}
              className="admin-btn admin-btn--gold"
            >
              {cleaning ? "Cleaning up…" : `Cleanup ${stuckCount} stuck generation${stuckCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ padding: "var(--space-lg) 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>
              No failed or stuck generations right now.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {items.map((item) => {
              const badge = statusBadge(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--dawn-08)",
                    padding: "var(--space-md)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          color: badge.color,
                          padding: "2px 6px",
                          border: `1px solid ${badge.color}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span className="admin-stat-label">
                        {item.session.project.name} / {item.session.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void retry(item.id)}
                      disabled={busyId === item.id}
                      className="admin-btn admin-btn--gold"
                    >
                      {busyId === item.id ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn)", marginBottom: "var(--space-xs)" }}>
                    {item.prompt}
                  </p>
                  {item.errorMessage && (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-error)", marginBottom: "var(--space-xs)" }}>
                      {item.errorMessage}
                    </p>
                  )}
                  <div className="admin-stat-label" style={{ color: "var(--dawn-30)" }}>
                    Model: {item.modelId} &middot; User: {item.user.displayName || item.user.username || item.user.id.slice(0, 8)}
                    {item.errorCategory && <> &middot; Category: {item.errorCategory}</>}
                    {item.errorRetryable !== null && <> &middot; {item.errorRetryable ? "Retryable" : "Not retryable"}</>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
