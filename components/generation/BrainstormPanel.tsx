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

  return (
    <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn-50)",
        }}
      >
        brainstorm
      </h2>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border border-[var(--dawn-08)] bg-[var(--void)] p-2">
        {loading ? (
          <p className="text-xs text-[var(--dawn-30)]">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-[var(--dawn-30)]">Start a concept thread for this project.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`border p-2 text-xs ${
                message.role === "assistant"
                  ? "border-[var(--dawn-15)] text-[var(--dawn-50)]"
                  : "border-[var(--gold)] text-[var(--gold)]"
              }`}
            >
              <div
                className="mb-1 text-[9px] uppercase tracking-[0.08em] opacity-80"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {message.role}
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask for concept variants, shot ideas, or style passes..."
          className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-xs text-[var(--dawn)] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            void sendMessage();
          }}
          disabled={submitting || !draft.trim()}
          className="border border-[var(--gold)] px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)] disabled:opacity-50"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {submitting ? "sending..." : "send"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
