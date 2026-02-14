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
    <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dawn-50)" }}>
          prompt enhancement templates
        </h2>
        <button
          type="button"
          onClick={() => {
            void createPrompt();
          }}
          className="border border-[var(--gold)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)]"
          style={{ fontFamily: "var(--font-mono)" }}
          disabled={creating}
        >
          {creating ? "creating..." : "new template"}
        </button>
      </div>

      {message ? <p className="mb-3 text-xs text-[var(--dawn-50)]">{message}</p> : null}

      <div className="space-y-3">
        {prompts.map((prompt) => {
          const isEditing = editingId === prompt.id;
          const modelIds = (isEditing ? draft.modelIds : prompt.modelIds) ?? [];
          return (
            <div key={prompt.id} className="border border-[var(--dawn-08)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  value={String(isEditing ? draft.name ?? "" : prompt.name)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none disabled:opacity-70"
                />
                <div className="ml-2 flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void saveEdit();
                        }}
                        className="border border-[var(--gold)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setDraft({});
                        }}
                        className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(prompt.id);
                          setDraft(prompt);
                        }}
                        className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deletePrompt(prompt.id);
                        }}
                        className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] hover:text-red-300"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <textarea
                value={String(isEditing ? draft.systemPrompt ?? "" : prompt.systemPrompt)}
                onChange={(e) => setDraft((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                disabled={!isEditing}
                rows={6}
                className="mb-2 w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-2 text-xs text-[var(--dawn)] outline-none disabled:opacity-70"
              />

              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs text-[var(--dawn-50)]">
                  Models (comma-separated)
                  <input
                    value={Array.isArray(modelIds) ? modelIds.join(", ") : ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        modelIds: e.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      }))
                    }
                    disabled={!isEditing}
                    className="mt-1 w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none disabled:opacity-70"
                    placeholder={defaultModels.join(", ")}
                  />
                </label>
                <label className="text-xs text-[var(--dawn-50)]">
                  Active
                  <select
                    value={String(isEditing ? draft.isActive ?? true : prompt.isActive)}
                    onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.value === "true" }))}
                    disabled={!isEditing}
                    className="mt-1 w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none disabled:opacity-70"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
