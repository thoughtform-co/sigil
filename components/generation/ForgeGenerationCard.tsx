"use client";

import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { GenerationItem, OutputItem } from "@/components/generation/types";
import { useVideoIterationCount } from "@/components/generation/VideoIterationCountsContext";
import { VideoIterationsStackGlow, VideoIterationsBarButton } from "@/components/generation/VideoIterationsStackHint";
import { SigilLoadingField } from "./SigilLoadingField";
import styles from "./ForgeGenerationCard.module.css";

function isProcessing(status: string): boolean {
  return status === "processing" || status === "processing_locked";
}

function isFailed(status: string): boolean {
  return status === "failed";
}

async function downloadFile(url: string, filename?: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);

    const blob = await res.blob();
    const ext = url.includes(".mp4") ? ".mp4"
      : url.includes(".webm") ? ".webm"
      : url.includes(".webp") ? ".webp"
      : url.includes(".jpg") || url.includes(".jpeg") ? ".jpg"
      : ".png";
    const name = (filename ?? "output") + ext;

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

type ForgeGenerationCardProps = {
  generation: GenerationItem;
  onRetry: (generationId: string) => void;
  onReuse: (generation: GenerationItem) => void;
  onRerun?: (generationId: string) => void;
  onDismiss?: (generationId: string) => void;
  onConvertToVideo?: (outputId: string, imageUrl: string, genMeta?: { generationId: string; modelId: string; createdAt: string; status: string }) => void;
  onUseAsReference?: (imageUrl: string) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  onLightboxOpen?: (url: string) => void;
  busy: boolean;
};

const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
const VIDEO_STUCK_THRESHOLD_MS = 15 * 60 * 1000;

function lastActivityAt(generation: GenerationItem): number {
  const createdAt = new Date(generation.createdAt).getTime();
  const heartbeatAt = generation.lastHeartbeatAt
    ? new Date(generation.lastHeartbeatAt).getTime()
    : Number.NaN;
  if (Number.isNaN(heartbeatAt)) return createdAt;
  return Math.max(createdAt, heartbeatAt);
}

function isLikelyStuck(generation: GenerationItem): boolean {
  if (!isProcessing(generation.status)) return false;
  const age = Date.now() - lastActivityAt(generation);
  const isVideo = generation.modelId.includes("veo") || generation.modelId.includes("kling");
  return age > (isVideo ? VIDEO_STUCK_THRESHOLD_MS : STUCK_THRESHOLD_MS);
}

function stuckAgeMinutes(generation: GenerationItem): number {
  return Math.round((Date.now() - lastActivityAt(generation)) / 60_000);
}

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
  const rawAspect = generation.parameters?.aspectRatio;
  if (typeof rawAspect === "string" && rawAspect.includes(":")) {
    return rawAspect.replace(":", " / ");
  }

  if (output.width && output.height && output.width > 0 && output.height > 0) {
    return `${output.width} / ${output.height}`;
  }

  return "16 / 9";
}

function getPlaceholderAspectRatio(generation: GenerationItem): string {
  const rawAspect = generation.parameters?.aspectRatio;
  if (typeof rawAspect === "string" && rawAspect.includes(":")) {
    return rawAspect.replace(":", " / ");
  }
  return "16 / 9";
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function OutputCard({
  output,
  generation,
  onReuse,
  onApprove,
  onConvertToVideo,
  onUseAsReference,
  onLightboxOpen,
  busy,
}: {
  output: OutputItem;
  generation: GenerationItem;
  onReuse: (generation: GenerationItem) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  onConvertToVideo?: (outputId: string, imageUrl: string, genMeta?: { generationId: string; modelId: string; createdAt: string; status: string }) => void;
  onUseAsReference?: (imageUrl: string) => void;
  onLightboxOpen?: (url: string) => void;
  busy: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const showVideoIterations = output.fileType !== "video" && Boolean(onConvertToVideo);
  const { count: iterCount, hasProcessing: iterProcessing } = useVideoIterationCount(
    showVideoIterations ? output.id : null,
  );

  const frameStyle = {
    aspectRatio: getAspectRatioStyle(output, generation),
  } as CSSProperties;

  return (
    <article className={`${styles.outputCard} forge-output-card`} style={{ overflow: "visible" }}>
      <div
        className={styles.mediaFrame}
        style={{ ...frameStyle, zIndex: 1, position: "relative" }}
      >
        {showVideoIterations && (
          <VideoIterationsStackGlow count={iterCount} hasProcessing={iterProcessing} />
        )}
        <div className={styles.mediaInset}>
          <div className={styles.mediaViewport}>
            {output.fileType === "video" ? (
              <video
                className={styles.media}
                controls
                src={output.fileUrl}
                preload="metadata"
                playsInline
                onLoadedData={() => setLoaded(true)}
              />
            ) : onLightboxOpen ? (
              <button
                type="button"
                className={styles.mediaButton}
                onClick={() => onLightboxOpen(output.fileUrl)}
                title="Open image"
              >
                <Image
                  fill
                  className={styles.media}
                  src={output.fileUrl}
                  alt="Generated output"
                  quality={85}
                  sizes="(max-width: 980px) 90vw, min(900px, 60vw)"
                  onLoad={() => setLoaded(true)}
                />
              </button>
            ) : (
              <Image
                fill
                className={styles.media}
                src={output.fileUrl}
                alt="Generated output"
                quality={85}
                sizes="(max-width: 980px) 90vw, min(900px, 60vw)"
                onLoad={() => setLoaded(true)}
              />
            )}
          </div>

          {/* Reveal overlay: noise + scanlines that dissolve when media loads */}
          <div
            className={styles.revealOverlay}
            style={{ opacity: loaded ? 0 : 1 }}
            aria-hidden
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: NOISE_SVG,
                backgroundSize: "256px 256px",
                opacity: 0.12,
                mixBlendMode: "overlay",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <button type="button" className={styles.actionButton} onClick={() => onReuse(generation)} disabled={busy} title="Reuse parameters">
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button type="button" className={`${styles.actionButton} ${output.isApproved ? styles.actionActive : ""}`} onClick={() => onApprove(output.id, !output.isApproved)} disabled={busy} title={output.isApproved ? "Remove bookmark" : "Bookmark"}>
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill={output.isApproved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button type="button" className={styles.actionButton} onClick={() => downloadFile(output.fileUrl, `output-${output.id.slice(0, 8)}`)} title="Download">
          <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
        <div className={styles.actionBarSpacer} />
        {output.fileType !== "video" && onUseAsReference && (
          <button type="button" className={styles.actionButton} onClick={() => onUseAsReference(output.fileUrl)} disabled={busy} title="Use as reference">
            <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: "rotate(-45deg)" }}>
              <path d="M17 7H7v10" />
              <path d="M17 7L7 17" />
            </svg>
          </button>
        )}
        {showVideoIterations && onConvertToVideo && (
          <VideoIterationsBarButton
            count={iterCount}
            hasProcessing={iterProcessing}
            onClick={() => onConvertToVideo(output.id, output.fileUrl, { generationId: generation.id, modelId: generation.modelId, createdAt: generation.createdAt, status: generation.status })}
          />
        )}
      </div>
    </article>
  );
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
  const [refPopupUrl, setRefPopupUrl] = useState<string | null>(null);
  const processing = isProcessing(generation.status);
  const stuck = isLikelyStuck(generation);
  const failed = isFailed(generation.status);
  const hasOutputs = generation.outputs.length > 0;
  const multiOutput = generation.outputs.length > 1;
  const hasBookmarked = generation.outputs.some((o) => o.isApproved);
  const phaseMessage = PHASE_MESSAGES[generation.id.length % PHASE_MESSAGES.length];
  const createdAt = formatCreatedAt(generation.createdAt);
  const referenceImageUrls = (() => {
    const refs: string[] = [];
    const multi = generation.parameters?.referenceImages;
    if (Array.isArray(multi)) {
      for (const item of multi) {
        if (typeof item !== "string") continue;
        const value = item.trim();
        if (!value || refs.includes(value)) continue;
        refs.push(value);
      }
    }
    const single = generation.parameters?.referenceImageUrl;
    if (refs.length === 0 && typeof single === "string" && single.trim().length > 0) {
      refs.push(single.trim());
    }
    return refs;
  })();
  const refImageUrl = referenceImageUrls[0] ?? null;
  const referenceRowCount =
    referenceImageUrls.length <= 5 ? 1 : Math.ceil(referenceImageUrls.length / 5);
  const referenceColumnCount = Math.max(
    1,
    Math.ceil(referenceImageUrls.length / referenceRowCount),
  );
  const referenceThumbGap = 4;
  const referenceGridMaxWidth = 156;
  const referenceThumbSize = Math.max(
    24,
    Math.min(
      56,
      Math.floor(
        (referenceGridMaxWidth - referenceThumbGap * (referenceColumnCount - 1)) /
          referenceColumnCount,
      ),
    ),
  );
  const referenceGridStyle = {
    gridTemplateColumns: `repeat(${referenceColumnCount}, ${referenceThumbSize}px)`,
    gap: `${referenceThumbGap}px`,
  } as CSSProperties;

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
  const statusLabel = hasBookmarked ? `${generation.status} / bookmarked` : generation.status;
  const idShort = generation.id.slice(0, 8);

  return (
    <div className={cardClass}>
      <aside className={styles.promptPanel}>
        <span className={styles.sectionTitle}>Prompt</span>
        <button
          type="button"
          className={`${styles.promptBlock} ${copied ? styles.promptCopied : ""}`}
          onClick={copyPrompt}
          title="Copy prompt"
        >
          <span className={styles.promptText}>{generation.prompt || "No prompt"}</span>
          {copied && <span className={styles.copiedBadge}>COPIED</span>}
        </button>

        <div className={styles.promptFooter}>
          {referenceImageUrls.length > 0 && (
            <>
              <span className={styles.sectionTitle}>
                {referenceImageUrls.length === 1 ? "Reference" : `References / ${referenceImageUrls.length}`}
              </span>
              <div className={styles.refThumbGrid} style={referenceGridStyle}>
                {referenceImageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={styles.refThumb}
                    onClick={() => {
                      if (onLightboxOpen) {
                        onLightboxOpen(url);
                        return;
                      }
                      setRefPopupUrl(url);
                    }}
                    title={onLightboxOpen ? `Open reference image ${index + 1}` : `View reference image ${index + 1}`}
                  >
                    <img src={url} alt={`Reference ${index + 1}`} className={styles.refThumbImg} />
                  </button>
                ))}
              </div>
            </>
          )}

          <span className={styles.sectionTitle}>Parameters</span>
          <div className={styles.metaReadouts}>
            <span className={styles.readout}>
              <span className={styles.readoutLabel}>ID</span>
              <span className={styles.readoutValue}>{idShort}</span>
            </span>
            <span className={styles.readout}>
              <span className={styles.readoutLabel}>MODEL</span>
              <span className={styles.readoutValue}>{generation.modelId || "Unknown"}</span>
            </span>
            <span className={styles.readout}>
              <span className={styles.readoutLabel}>DATE</span>
              <span className={styles.readoutValue}>{createdAt}</span>
            </span>
            <span className={styles.readout}>
              <span className={styles.readoutLabel}>STATUS</span>
              <span className={styles.readoutValue}>{statusLabel}</span>
            </span>
            {generation.source === "workflow" && (
              <span className={styles.readout} title="Created from canvas workflow">
                <span className={styles.canvasBadge}>CANVAS</span>
              </span>
            )}
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
            {onDismiss && (failed || stuck) && (
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
        </div>
      </aside>

      <section className={styles.mediaPanel}>
        {hasOutputs ? (
          <div className={`${styles.mediaGrid} ${multiOutput ? styles.mediaGridMulti : styles.mediaGridSingle}`}>
            {generation.outputs.map((output: OutputItem) => (
              <OutputCard
                key={output.id}
                output={output}
                generation={generation}
                onReuse={onReuse}
                onApprove={onApprove}
                onConvertToVideo={onConvertToVideo}
                onUseAsReference={onUseAsReference}
                onLightboxOpen={onLightboxOpen}
                busy={busy}
              />
            ))}
          </div>
        ) : processing ? (
          <div
            className={styles.mediaState}
            style={{ aspectRatio: getPlaceholderAspectRatio(generation) }}
          >
            <div className={styles.mediaStateCornerMarks} aria-hidden />
            <div className={styles.mediaStateCornerMarksSecondary} aria-hidden />
            <SigilLoadingField
              seed={generation.id}
              createdAt={generation.createdAt}
              modelId={generation.modelId}
            />
            <div className={styles.mediaStateContent}>
              {stuck ? (
                <>
                  <span className={styles.failedTitle}>Taking unusually long</span>
                  <span className={styles.errorMessage}>
                    Processing for {stuckAgeMinutes(generation)} min — this generation may have stalled.
                  </span>
                  <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
                    <button
                      type="button"
                      className={styles.textAction}
                      onClick={() => onRetry(generation.id)}
                      disabled={busy}
                    >
                      Try Again
                    </button>
                    {onDismiss && (
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
                </>
              ) : (
                <span className={styles.phaseMessage}>{phaseMessage}</span>
              )}
            </div>
          </div>
        ) : failed ? (
          <div
            className={styles.mediaState}
            style={{ aspectRatio: getPlaceholderAspectRatio(generation) }}
          >
            <div className={styles.mediaStateCornerMarks} aria-hidden />
            <div className={styles.mediaStateCornerMarksSecondary} aria-hidden />
            <div className={styles.mediaStateContent}>
              <span className={styles.failedTitle}>Traversal collapsed</span>
              <span className={styles.errorMessage}>
                {generation.errorMessage || "Generation failed."}
              </span>
              <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
                {generation.errorRetryable !== false && (
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={() => onRetry(generation.id)}
                    disabled={busy}
                  >
                    Retry
                  </button>
                )}
                {onDismiss && (
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
            </div>
          </div>
        ) : (
          <div
            className={styles.mediaState}
            style={{ aspectRatio: getPlaceholderAspectRatio(generation) }}
          >
            <div className={styles.mediaStateCornerMarks} aria-hidden />
            <div className={styles.mediaStateCornerMarksSecondary} aria-hidden />
            <div className={styles.mediaStateContent}>
              <span className={styles.phaseMessage}>No outputs available.</span>
            </div>
          </div>
        )}
      </section>

      {refPopupUrl && (
        <div className={styles.refPopupBackdrop} onClick={() => setRefPopupUrl(null)}>
          <div className={styles.refPopup} onClick={(e) => e.stopPropagation()}>
            <img src={refPopupUrl} alt="Reference" className={styles.refPopupImg} />
            <button
              type="button"
              className={styles.refPopupClose}
              onClick={() => setRefPopupUrl(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
