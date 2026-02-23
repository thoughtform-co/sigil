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
    <section className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
      <h2 className="sigil-section-label mb-3" style={{ fontSize: "10px", letterSpacing: "0.08em" }}>
        failed generations
      </h2>

      {error ? (
        <p className="mb-2 text-xs" style={{ color: "var(--status-error)" }} role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="hud-panel-empty" style={{ borderTop: "none", paddingTop: 0 }}>
          <p className="hud-panel-empty-body">No failed generations right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border border-[var(--dawn-08)] p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]">
                  {item.session.project.name} / {item.session.name}
                </div>
                <button
                  type="button"
                  onClick={() => void retry(item.id)}
                  disabled={busyId === item.id}
                  className="sigil-btn-secondary"
                >
                  {busyId === item.id ? "retrying..." : "retry"}
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--dawn)]">{item.prompt}</p>
              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-30)]">
                model: {item.modelId} | user: {item.user.displayName || item.user.username || item.user.id.slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
