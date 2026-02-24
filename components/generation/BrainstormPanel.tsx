"use client";

import { useEffect, useState } from "react";
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
  open?: boolean;
  onClose?: () => void;
  variant?: "docked" | "floating";
};

export function BrainstormPanel({
  projectId,
  onSendPrompt,
  open = true,
  onClose,
  variant = "docked",
}: BrainstormPanelProps) {
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
        const response = await fetch(`/api/projects/${projectId}/brainstorm/messages`, {
          cache: "no-store",
        });
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

  const panelContent = (
    <>
      <div className={styles.header}>
        <h2 className={styles.label}>Brainstorm</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close brainstorm panel"
          >
            Close
          </button>
        )}
      </div>
      <div className={styles.messages}>
        {loading ? (
          <p className={styles.loading}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>Start a concept thread for this project.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.card} ${
                message.role === "assistant" ? styles.cardAssistant : styles.cardUser
              }`}
            >
              <div className={styles.cardHeader}>
                <span className={styles.role}>{message.role}</span>
                {message.role === "assistant" && onSendPrompt && (
                  <button
                    type="button"
                    onClick={() => onSendPrompt(message.content)}
                    className={styles.usePromptBtn}
                  >
                    Use as prompt
                  </button>
                )}
              </div>
              <p className={styles.cardBody}>{message.content}</p>
            </div>
          ))
        )}
      </div>
      <div className={styles.compose}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask for concept variants, shot ideas, or style passes…"
          className={styles.textarea}
          rows={2}
        />
        <div className={styles.buttons}>
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={submitting || !draft.trim()}
            className={styles.sendPrimary}
          >
            {submitting ? "Sending…" : "Send"}
          </button>
          {onSendPrompt && draft.trim() && (
            <button
              type="button"
              onClick={() => {
                onSendPrompt(draft.trim());
                setDraft("");
              }}
              className={styles.sendToPrompt}
            >
              Send to prompt
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );

  if (variant === "floating") {
    return (
      <div className={styles.floatingBackdrop}>
        <div className={styles.floatingPanel}>{panelContent}</div>
      </div>
    );
  }

  return <div className={styles.panel}>{panelContent}</div>;
}
