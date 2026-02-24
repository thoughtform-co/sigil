"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SessionItem } from "@/components/generation/types";
import type { ModelItem } from "@/components/generation/types";
import { useVideoIterations } from "@/hooks/useVideoIterations";
import styles from "./ConvertToVideoModal.module.css";

type ConvertToVideoModalProps = {
  projectId: string;
  outputId: string;
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

function iterationStatusLabel(status: string): string {
  switch (status) {
    case "processing":
    case "processing_locked":
      return "Processing…";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function ConvertToVideoModal({
  projectId,
  outputId,
  imageUrl,
  open,
  onClose,
}: ConvertToVideoModalProps) {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("1024");
  const [numOutputs, setNumOutputs] = useState("1");
  const [duration, setDuration] = useState("5");
  const [sessionId, setSessionId] = useState<string>("new");
  const [sessionName, setSessionName] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);

  const { iterations, loading: iterationsLoading, refetch } = useVideoIterations(open ? outputId : null);

  useEffect(() => {
    if (!open || !projectId) return;
    setSessionsLoading(true);
    fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { sessions?: SessionItem[] }) => {
        const list = data.sessions ?? [];
        setSessions(list.filter((s) => s.type === "video"));
        const firstVideo = list.find((s) => s.type === "video");
        if (firstVideo) setSessionId((prev) => (prev === "new" ? firstVideo.id : prev));
      })
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    setModelsLoading(true);
    fetch("/api/models?type=video", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { models?: ModelItem[] }) => {
        const list = data.models ?? [];
        setModels(list);
        setModelId((prev) => (prev ? prev : list[0]?.id ?? ""));
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !modelId) {
      setMessage("Prompt and model are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      let targetSessionId = sessionId;
      if (sessionId === "new") {
        const name = sessionName.trim() || `Video Session ${sessions.length + 1}`;
        const sessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name, type: "video" }),
        });
        const sessionData = (await sessionRes.json()) as { session?: SessionItem; error?: string };
        if (!sessionRes.ok) throw new Error(sessionData.error ?? "Failed to create session");
        targetSessionId = sessionData.session!.id;
      }

      const parameters: Record<string, unknown> = {
        aspectRatio,
        resolution: Number(resolution),
        numOutputs: Number(numOutputs),
        duration: Number(duration),
        referenceImageUrl: imageUrl,
        sourceOutputId: outputId,
        referenceImageId: outputId,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: targetSessionId,
          modelId,
          prompt: prompt.trim(),
          parameters,
        }),
      });
      const data = (await res.json()) as { generation?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit generation");
      setMessage("Generation queued.");
      setPrompt("");
      await refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }, [
    prompt,
    modelId,
    sessionId,
    sessionName,
    sessions.length,
    aspectRatio,
    resolution,
    numOutputs,
    duration,
    imageUrl,
    outputId,
    projectId,
    refetch,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const panel = (
    <div
      className={styles.backdrop}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <h2 id="convert-modal-title" className={styles.title}>
            Convert to video
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.formSection}>
            <div className={styles.previewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Source" className={styles.previewImg} />
            </div>
            <label className={styles.label}>Prompt</label>
            <textarea
              className="sigil-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the motion…"
              rows={2}
              disabled={busy}
            />
            <label className={styles.label}>Video session</label>
            <div className={styles.sessionRow}>
              <select
                className="sigil-input"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={busy || sessionsLoading}
                aria-label="Session"
              >
                <option value="new">Create new session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {sessionId === "new" && (
                <input
                  type="text"
                  className="sigil-input"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="New session name"
                  disabled={busy}
                  aria-label="New session name"
                />
              )}
            </div>
            <label className={styles.label}>Model</label>
            <select
              className="sigil-input"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={busy || modelsLoading}
              aria-label="Model"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.provider ? `(${m.provider})` : ""}
                </option>
              ))}
            </select>
            <div className={styles.paramsRow}>
              <select
                className={styles.paramSelect}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={busy}
                aria-label="Aspect ratio"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
              <select
                className={styles.paramSelect}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={busy}
                aria-label="Resolution"
              >
                <option value="1024">1K</option>
                <option value="2048">2K</option>
                <option value="4096">4K</option>
              </select>
              <select
                className={styles.paramSelect}
                value={numOutputs}
                onChange={(e) => setNumOutputs(e.target.value)}
                disabled={busy}
                aria-label="Outputs"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <div className={styles.durationGroup} role="group" aria-label="Duration">
                <button
                  type="button"
                  className={`${styles.durationBtn} ${duration === "5" ? styles.durationActive : ""}`}
                  onClick={() => setDuration("5")}
                  disabled={busy}
                >
                  5s
                </button>
                <button
                  type="button"
                  className={`${styles.durationBtn} ${duration === "10" ? styles.durationActive : ""}`}
                  onClick={() => setDuration("10")}
                  disabled={busy}
                >
                  10s
                </button>
              </div>
            </div>
            {message && (
              <p className={styles.message} role="status">
                {message}
              </p>
            )}
          </div>

          <div className={styles.iterationsSection}>
            <h3 className={styles.iterationsTitle}>Video iterations</h3>
            {iterationsLoading ? (
              <p className={styles.iterationsEmpty}>Loading…</p>
            ) : iterations.length === 0 ? (
              <p className={styles.iterationsEmpty}>No video iterations yet. Submit to create one.</p>
            ) : (
              <ul className={styles.iterationsList}>
                {iterations.map((it) => (
                  <li key={it.id} className={styles.iterationItem}>
                    <div className={styles.iterationMeta}>
                      <span className={styles.iterationStatus} data-status={it.status}>
                        {iterationStatusLabel(it.status)}
                      </span>
                      <span className={styles.iterationTime}>
                        {new Date(it.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {it.outputs[0]?.fileType?.startsWith("video") ? (
                      <video
                        src={it.outputs[0].fileUrl}
                        className={styles.iterationMedia}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : it.outputs[0]?.fileUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.outputs[0].fileUrl}
                        alt=""
                        className={styles.iterationMedia}
                      />
                    ) : (
                      <div className={styles.iterationPlaceholder}>Processing…</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void handleSubmit()}
            disabled={busy || !prompt.trim() || !modelId}
          >
            {busy ? "Submitting…" : "Generate video"}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
