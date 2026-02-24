"use client";

import { useEffect, useState } from "react";

type FailedGeneration = {
  id: string;
  modelId: string;
  prompt: string;
  createdAt: string;
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

export function FailedGenerationsPanel() {
  const [items, setItems] = useState<FailedGeneration[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const response = await fetch("/api/admin/failed-generations", { cache: "no-store" });
    const data = (await response.json()) as { generations?: FailedGeneration[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Failed to load failed generations");
    setItems(data.generations ?? []);
  }

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load failed generations");
    });
  }, []);

  async function retry(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/failed-generations/${id}/retry`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to retry generation");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry generation");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-title">Failed Generations</div>
      <div className="admin-section-body">
        {error && (
          <p style={{ marginBottom: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-error)" }} role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div style={{ padding: "var(--space-lg) 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>
              No failed generations right now.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--dawn-08)",
                  padding: "var(--space-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
                  <span className="admin-stat-label">
                    {item.session.project.name} / {item.session.name}
                  </span>
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
                <div className="admin-stat-label" style={{ color: "var(--dawn-30)" }}>
                  Model: {item.modelId} &middot; User: {item.user.displayName || item.user.username || item.user.id.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
