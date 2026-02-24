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
  onUseAsReference?: (imageUrl: string) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  onLightboxOpen?: (url: string) => void;
  busy: boolean;
};

const PHASE_MESSAGES = [
  "Navigating latent topology…",
  "Resolving temporal manifold…",
  "Stabilizing output field…",
];

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAspectRatioStyle(output: OutputItem, generation: GenerationItem): string {
  if (output.width && output.height && output.width > 0 && output.height > 0) {
    return `${output.width} / ${output.height}`;
  }

  const rawAspect = generation.parameters?.aspectRatio;
  if (typeof rawAspect === "string" && rawAspect.includes(":")) {
    return rawAspect.replace(":", " / ");
  }

  return "16 / 9";
}

export function ForgeGenerationCard({
  generation,
  onRetry,
  onReuse,
  onRerun,
  onDismiss,
  onConvertToVideo,
  onUseAsReference,
  onApprove,
  onLightboxOpen,
  busy,
}: ForgeGenerationCardProps) {
  const [copied, setCopied] = useState(false);
  const processing = isProcessing(generation.status);
  const failed = isFailed(generation.status);
  const hasOutputs = generation.outputs.length > 0;
  const multiOutput = generation.outputs.length > 1;
  const hasApproved = generation.outputs.some((o) => o.isApproved);
  const phaseMessage = PHASE_MESSAGES[generation.id.length % PHASE_MESSAGES.length];
  const createdAt = formatCreatedAt(generation.createdAt);

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
  const statusLabel = hasApproved ? `${generation.status} / approved` : generation.status;

  return (
    <div className={cardClass}>
      <aside className={styles.promptPanel}>
        <button
          type="button"
          className={`${styles.promptBlock} ${copied ? styles.promptCopied : ""}`}
          onClick={copyPrompt}
          title="Copy prompt"
        >
          <span className={styles.promptText}>{generation.prompt || "No prompt"}</span>
          {copied && <span className={styles.copiedBadge}>COPIED</span>}
        </button>

        <div className={styles.metaReadouts}>
          <span className={styles.readout}>MODEL: {generation.modelId || "Unknown"}</span>
          <span className={styles.readout}>DATE: {createdAt}</span>
          <span className={styles.readout}>STATUS: {statusLabel}</span>
        </div>

        <div className={styles.promptActions}>
          {failed ? (
            <button
              type="button"
              className={styles.textAction}
              onClick={() => onRetry(generation.id)}
              disabled={busy}
            >
              Retry
            </button>
          ) : (
            onRerun && (
              <button
                type="button"
                className={styles.textAction}
                onClick={() => onRerun(generation.id)}
                disabled={busy}
              >
                Rerun
              </button>
            )
          )}
          {onDismiss && failed && (
            <button
              type="button"
              className={styles.textAction}
              onClick={() => onDismiss(generation.id)}
              disabled={busy}
            >
              Dismiss
            </button>
          )}
        </div>
      </aside>

      <section className={styles.mediaPanel}>
        {hasOutputs ? (
          <div className={`${styles.mediaGrid} ${multiOutput ? styles.mediaGridMulti : styles.mediaGridSingle}`}>
            {generation.outputs.map((output: OutputItem) => (
              <article key={output.id} className={styles.outputCard}>
                <div
                  className={styles.mediaFrame}
                  style={{ aspectRatio: getAspectRatioStyle(output, generation) }}
                >
                  {output.fileType === "video" ? (
                    <video
                      className={styles.media}
                      controls
                      src={output.fileUrl}
                      preload="metadata"
                      playsInline
                    />
                  ) : onLightboxOpen ? (
                    <button
                      type="button"
                      className={styles.mediaButton}
                      onClick={() => onLightboxOpen(output.fileUrl)}
                      title="Open image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.media} src={output.fileUrl} alt="Generated output" />
                    </button>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img className={styles.media} src={output.fileUrl} alt="Generated output" />
                  )}

                  <div className={styles.hoverActions}>
                    <div className={styles.actionsTopLeft}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => downloadFile(output.fileUrl, `output-${output.id.slice(0, 8)}`)}
                        title="Download"
                      >
                        <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                      </button>
                    </div>

                    <div className={styles.actionsTopRight}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${output.isApproved ? styles.actionActive : ""}`}
                        onClick={() => onApprove(output.id, !output.isApproved)}
                        disabled={busy}
                        title={output.isApproved ? "Unapprove" : "Approve"}
                      >
                        <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                    </div>

                    <div className={styles.actionsBottomLeft}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onReuse(generation)}
                        disabled={busy}
                        title="Reuse parameters"
                      >
                        <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>

                    {output.fileType !== "video" && (
                      <div className={styles.actionsBottomRight}>
                        {onUseAsReference && (
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => onUseAsReference(output.fileUrl)}
                            disabled={busy}
                            title="Use as reference"
                          >
                            <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 7H7v10" />
                              <path d="M17 7L7 17" />
                            </svg>
                          </button>
                        )}
                        {onConvertToVideo && (
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => onConvertToVideo(output.fileUrl)}
                            disabled={busy}
                            title="Convert to video"
                          >
                            <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : processing ? (
          <div className={styles.mediaState}>
            <div className={styles.progressDiamond}>
              <span className={styles.progressPercent}>…</span>
            </div>
            <span className={styles.phaseMessage}>{phaseMessage}</span>
          </div>
        ) : failed ? (
          <div className={styles.mediaState}>
            <span className={styles.failedTitle}>Traversal collapsed</span>
            <span className={styles.errorMessage}>Generation failed.</span>
            <button
              type="button"
              className={styles.textAction}
              onClick={() => onRetry(generation.id)}
              disabled={busy}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className={styles.mediaState}>
            <span className={styles.phaseMessage}>No outputs available.</span>
          </div>
        )}
      </section>
    </div>
  );
}
