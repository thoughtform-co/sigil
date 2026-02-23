"use client";

import { useEffect, useState } from "react";

type BrainstormMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export function BrainstormPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/brainstorm/messages`, { cache: "no-store" });
        const data = (await response.json()) as { messages?: BrainstormMessage[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to load brainstorm messages");
        setMessages(data.messages ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load brainstorm messages");
      } finally {
        setLoading(false);
      }
    }
    void loadMessages();
  }, [projectId]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brainstorm/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { messages?: BrainstormMessage[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to send brainstorm message");
      setMessages((prev) => [...prev, ...(data.messages ?? [])]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send brainstorm message");
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--dawn-50)",
  };

  return (
    <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4 shrink-0">
      <h2 style={labelStyle}>brainstorm</h2>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border border-[var(--dawn-08)] bg-[var(--void)] p-2 min-h-[80px]">
        {loading ? (
          <p className="text-xs text-[var(--dawn-30)]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-[var(--dawn-30)]">Start a concept thread for this project.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`sigil-brainstorm-card border p-2 text-xs transition-colors ${
                message.role === "assistant"
                  ? "border-[var(--dawn-15)] bg-[var(--dawn-04)] text-[var(--dawn-70)]"
                  : "border-[var(--gold-30)] bg-[var(--gold-10)] text-[var(--dawn)]"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <div className="mb-1 text-[9px] uppercase tracking-[0.08em] opacity-80">
                {message.role}
              </div>
              <p className="whitespace-pre-wrap font-sans text-sm">{message.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask for concept variants, shot ideas, or style passes…"
          className="sigil-textarea flex-1 min-w-0 resize-y"
          rows={2}
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={submitting || !draft.trim()}
          className="sigil-btn-primary shrink-0 disabled:opacity-50"
        >
          {submitting ? "sending…" : "send"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-[var(--status-error)]" role="alert">{error}</p> : null}
    </div>
  );
}
