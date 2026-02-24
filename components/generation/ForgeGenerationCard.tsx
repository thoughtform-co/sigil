"use client";

import { useCallback, useState } from "react";
import type { GenerationItem, OutputItem } from "@/components/generation/types";
import styles from "./ForgeGenerationCard.module.css";

function isProcessing(status: string): boolean {
  return status === "processing" || status === "processing_locked";
}

function isFailed(status: string): boolean {
  return status === "failed";
}

function downloadFile(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "output";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

type ForgeGenerationCardProps = {
  generation: GenerationItem;
  onRetry: (generationId: string) => void;
  onReuse: (generation: GenerationItem) => void;
  onRerun?: (generationId: string) => void;
  onDismiss?: (generationId: string) => void;
  onConvertToVideo?: (imageUrl: string) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  onDeleteOutput: (outputId: string) => void;
  onLightboxOpen?: (url: string) => void;
  busy: boolean;
};

const PHASE_MESSAGES = [
  "Navigating latent topology…",
  "Resolving temporal manifold…",
  "Stabilizing output field…",
];

export function ForgeGenerationCard({
  generation,
  onRetry,
  onReuse,
  onRerun,
  onDismiss,
  onConvertToVideo,
  onApprove,
  onDeleteOutput,
  onLightboxOpen,
  busy,
}: ForgeGenerationCardProps) {
  const [copied, setCopied] = useState(false);
  const processing = isProcessing(generation.status);
  const failed = isFailed(generation.status);
  const firstOutput: OutputItem | null = generation.outputs[0] ?? null;
  const restOutputs = generation.outputs.slice(1);
  const hasApproved = generation.outputs.some((o) => o.isApproved);
  const phaseMessage = PHASE_MESSAGES[generation.id.length % PHASE_MESSAGES.length];

  const copyPrompt = useCallback(() => {
    if (!generation.prompt) return;
    navigator.clipboard.writeText(generation.prompt).then(() => {
      setCopied(true);
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    });
  }, [generation.prompt]);

  const cardClass = [
    styles.card,
    processing ? styles.cardProcessing : "",
    failed ? styles.cardFailed : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClass}>
      {/* Prompt banner */}
      <button
        type="button"
        className={`${styles.promptLine} ${copied ? styles.promptCopied : ""}`}
        onClick={copyPrompt}
      >
        <span className={styles.promptText}>{generation.prompt || "No prompt"}</span>
        {copied && <span className={styles.copiedBadge}>COPIED</span>}
      </button>

      {/* 16:9 media container */}
      <div className={styles.videoContainer}>
        {/* Primary media: first output or empty when processing with no outputs */}
        {firstOutput && firstOutput.fileType === "video" && (
          <video
            className={styles.video}
            controls
            src={firstOutput.fileUrl}
            preload="metadata"
            playsInline
          />
        )}
        {firstOutput && firstOutput.fileType !== "video" && (
          <>
            {onLightboxOpen ? (
              <button
                type="button"
                onClick={() => onLightboxOpen(firstOutput.fileUrl)}
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: 0,
                  border: 0,
                  cursor: "pointer",
                  background: "transparent",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.sourceImage}
                  src={firstOutput.fileUrl}
                  alt="Generated output"
                />
              </button>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className={styles.sourceImage}
                src={firstOutput.fileUrl}
                alt="Generated output"
              />
            )}
          </>
        )}

        {/* Processing overlay */}
        {processing && (
          <div className={styles.processingOverlay}>
            <div className={styles.progressIcon}>
              <div className={styles.progressDiamond}>
                <span className={styles.progressPercent}>…</span>
              </div>
            </div>
            <div className={styles.progressInfo}>
              <span className={styles.phaseMessage}>{phaseMessage}</span>
            </div>
          </div>
        )}

        {/* Failed overlay */}
        {failed && (
          <div className={styles.failedOverlay}>
            <div className={styles.failedIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <span className={styles.failedTitle}>Traversal collapsed</span>
            <span className={styles.errorMessage}>
              {generation.status === "failed" ? "Generation failed." : ""}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(generation.id)}
                disabled={busy}
                className={styles.actionButton}
                style={{ marginTop: 8 }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Approved badge */}
        {hasApproved && (
          <div className={styles.approvedBadge} title="Approved">
            ✓
          </div>
        )}

        {/* Hover actions (only when we have a first output and not processing) */}
        {!processing && !failed && firstOutput && (
          <div className={styles.hoverActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${firstOutput.isApproved ? styles.actionActive : ""}`}
              onClick={() => onApprove(firstOutput.id, !firstOutput.isApproved)}
              disabled={busy}
              title={firstOutput.isApproved ? "Unapprove" : "Approve"}
            >
              <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => downloadFile(firstOutput.fileUrl, `output-${firstOutput.id.slice(0, 8)}`)}
              title="Download"
            >
              <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onReuse(generation)}
              disabled={busy}
              title="Reuse params"
            >
              <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {firstOutput.fileType !== "video" && onConvertToVideo && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onConvertToVideo(firstOutput.fileUrl)}
                disabled={busy}
                title="Convert to video"
              >
                <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => onDeleteOutput(firstOutput.id)}
              disabled={busy}
              title="Delete output"
            >
              <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Extra outputs row */}
      {restOutputs.length > 0 && (
        <div className={styles.extraOutputs}>
          {restOutputs.map((output) => (
            <div key={output.id} style={{ position: "relative" }}>
              {output.fileType === "video" ? (
                <video
                  className={styles.extraThumb}
                  src={output.fileUrl}
                  preload="metadata"
                  muted
                  playsInline
                  onClick={() => onLightboxOpen?.(output.fileUrl)}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.extraThumb}
                  src={output.fileUrl}
                  alt=""
                  onClick={() => onLightboxOpen?.(output.fileUrl)}
                />
              )}
              <div style={{ position: "absolute", bottom: 4, right: 4, display: "flex", gap: 2 }}>
                <button
                  type="button"
                  className={styles.actionButton}
                  style={{ width: 24, height: 24 }}
                  onClick={() => onApprove(output.id, !output.isApproved)}
                  disabled={busy}
                  title={output.isApproved ? "Unapprove" : "Approve"}
                >
                  <svg className={styles.actionIcon} style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  style={{ width: 24, height: 24 }}
                  onClick={() => onDeleteOutput(output.id)}
                  disabled={busy}
                  title="Delete"
                >
                  <svg className={styles.actionIcon} style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
