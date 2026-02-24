"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BrainstormPanel.module.css";

type BrainstormMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type BrainstormPanelProps = {
  projectId: string;
  onSendPrompt?: (text: string) => void;
  onClose?: () => void;
};

export function BrainstormPanel({
  projectId,
  onSendPrompt,
  onClose,
}: BrainstormPanelProps) {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/brainstorm/messages`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { messages?: BrainstormMessage[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        setMessages(data.messages ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void loadMessages();
  }, [projectId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

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
      if (!response.ok) throw new Error(data.error ?? "Failed to send");
      setMessages((prev) => [...prev, ...(data.messages ?? [])]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>brainstorm</span>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            esc
          </button>
        )}
      </div>

      <div className={styles.messages} ref={logRef}>
        {loading ? (
          <p className={styles.loading}>loading…</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>no messages yet. start a concept thread.</p>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={styles.line}>
                <span className={`${styles.prefix} ${isUser ? styles.prefixUser : ""}`}>
                  {isUser ? ">" : "$"}
                </span>
                <span className={isUser ? styles.lineContentUser : styles.lineContent}>
                  {msg.content}
                </span>
                {!isUser && onSendPrompt && (
                  <button
                    type="button"
                    className={styles.useLink}
                    onClick={() => onSendPrompt(msg.content)}
                  >
                    [use]
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className={styles.compose}>
        <span className={styles.promptPrefix}>{">"}</span>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="concept, variant, style pass…"
          className={styles.input}
          disabled={submitting}
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={submitting || !draft.trim()}
          className={styles.sendBtn}
        >
          {submitting ? "…" : "send"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
