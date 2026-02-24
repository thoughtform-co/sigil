"use client";

import { useEffect, useState } from "react";

type PromptItem = {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  isActive: boolean;
  modelIds: string[];
};

const defaultModels = [
  "gemini-2.5-flash-image",
  "veo-3.1",
  "seedream-4",
  "reve",
  "kling-2.6",
  "nano-banana-backup",
  "fal-seedream-4",
  "kling-official",
];

export function PromptEnhancementAdmin() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PromptItem>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadPrompts() {
    const response = await fetch("/api/admin/prompt-enhancements", { cache: "no-store" });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      setMessage(data.error ?? "Failed to load prompts");
      return;
    }
    setPrompts(data as PromptItem[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrompts();
  }, []);

  async function saveEdit() {
    if (!editingId) return;
    const response = await fetch(`/api/admin/prompt-enhancements/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Failed to save prompt");
      return;
    }
    setEditingId(null);
    setDraft({});
    setMessage("Prompt updated.");
    await loadPrompts();
  }

  async function deletePrompt(id: string) {
    const response = await fetch(`/api/admin/prompt-enhancements/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Failed to delete prompt");
      return;
    }
    setMessage("Prompt deleted.");
    await loadPrompts();
  }

  async function createPrompt() {
    const payload = {
      name: "Default Enhancement Prompt",
      description: "Default template for prompt enhancement",
      systemPrompt:
        "You are an expert prompt engineer. Return only the improved prompt text. Preserve user intent and improve clarity and specificity.",
      modelIds: ["seedream-4"],
      isActive: true,
    };
    const response = await fetch("/api/admin/prompt-enhancements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create prompt");
      return;
    }
    setMessage("Prompt created.");
    setCreating(false);
    await loadPrompts();
  }

  return (
    <div className="admin-section">
      <div className="admin-section-title">
        <span>Prompt Enhancement Templates</span>
        <button
          type="button"
          onClick={() => { void createPrompt(); }}
          className="admin-btn admin-btn--gold"
          disabled={creating}
        >
          {creating ? "Creating…" : "New Template"}
        </button>
      </div>
      <div className="admin-section-body">
        {message && (
          <p style={{ marginBottom: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-50)" }}>
            {message}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {prompts.map((prompt) => {
            const isEditing = editingId === prompt.id;
            const modelIds = (isEditing ? draft.modelIds : prompt.modelIds) ?? [];
            return (
              <div
                key={prompt.id}
                style={{
                  border: "1px solid var(--dawn-08)",
                  background: isEditing ? "var(--dawn-04)" : "transparent",
                  padding: "var(--space-md)",
                  transition: "background 100ms ease",
                }}
              >
                {/* Name row */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                  <input
                    value={String(isEditing ? draft.name ?? "" : prompt.name)}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="admin-input"
                    style={{ flex: 1, opacity: isEditing ? 1 : 0.7 }}
                  />
                  <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => { void saveEdit(); }} className="admin-btn admin-btn--gold">Save</button>
                        <button type="button" onClick={() => { setEditingId(null); setDraft({}); }} className="admin-btn">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditingId(prompt.id); setDraft(prompt); }} className="admin-btn">Edit</button>
                        <button type="button" onClick={() => { void deletePrompt(prompt.id); }} className="admin-btn admin-btn--danger">Delete</button>
                      </>
                    )}
                  </div>
                </div>

                {/* System prompt */}
                <textarea
                  value={String(isEditing ? draft.systemPrompt ?? "" : prompt.systemPrompt)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  disabled={!isEditing}
                  rows={5}
                  className="admin-input"
                  style={{
                    resize: "vertical",
                    marginBottom: "var(--space-md)",
                    opacity: isEditing ? 1 : 0.7,
                  }}
                />

                {/* Models + Active */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                  <div>
                    <label className="admin-label">Models (comma-separated)</label>
                    <input
                      value={Array.isArray(modelIds) ? modelIds.join(", ") : ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          modelIds: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                        }))
                      }
                      disabled={!isEditing}
                      className="admin-input"
                      style={{ opacity: isEditing ? 1 : 0.7 }}
                      placeholder={defaultModels.join(", ")}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Active</label>
                    <select
                      value={String(isEditing ? draft.isActive ?? true : prompt.isActive)}
                      onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.value === "true" }))}
                      disabled={!isEditing}
                      className="admin-input"
                      style={{ opacity: isEditing ? 1 : 0.7 }}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
