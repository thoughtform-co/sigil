"use client";

import styles from "./VideoIterationsStackHint.module.css";

type IterationStatus = {
  count: number;
  hasProcessing: boolean;
};

type VideoIterationsStackHintProps = {
  outputId: string;
  onClick?: () => void;
};

const STACK_LAYERS = 3;
const GLOW_COLOR = "202, 165, 84"; /* --gold #caa554 */

export function VideoIterationsStackGlow({ count, hasProcessing }: IterationStatus) {
  const showStackEffect = count > 0 || hasProcessing;

  if (!showStackEffect) return null;

  return (
    <div
      className={`${styles.wrapper} ${hasProcessing ? styles.pulsing : ""}`}
      aria-hidden
    >
      {Array.from({ length: STACK_LAYERS }).map((_, index) => {
        const layerIndex = STACK_LAYERS - index - 1;
        const offset = (layerIndex + 1) * 8;
        const verticalOffset = offset * 0.3;
        const scale = 1 - layerIndex * 0.02;
        const baseOpacity = hasProcessing ? 0.22 : 0.16;
        const opacity = baseOpacity - layerIndex * 0.03;
        return (
          <div
            key={`stack-${layerIndex}`}
            className={styles.stackLayer}
            style={{
              top: `${verticalOffset}px`,
              left: `${offset}px`,
              right: `${-offset}px`,
              bottom: `${-verticalOffset}px`,
              zIndex: -10 - layerIndex,
              transform: `scale(${scale})`,
              background: `linear-gradient(to left, rgba(${GLOW_COLOR}, ${opacity * 0.4}) 0%, rgba(${GLOW_COLOR}, ${opacity * 0.2}) 45%, transparent 85%)`,
              border: `1px solid rgba(${GLOW_COLOR}, ${opacity * 0.9})`,
              borderLeft: 0,
              boxShadow: `${offset}px 0 ${offset * 1.5}px -${offset * 0.7}px rgba(${GLOW_COLOR}, ${opacity * 0.45}), inset 8px 0 ${10 + layerIndex * 2}px rgba(${GLOW_COLOR}, ${opacity * 0.2})`,
            }}
          />
        );
      })}
    </div>
  );
}

export function VideoIterationsBarButton({ count, hasProcessing, onClick }: IterationStatus & { onClick?: () => void }) {
  const hasVideos = count > 0;

  return (
    <button
      type="button"
      className={`${styles.barButton} ${hasProcessing ? styles.spin : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={
        hasProcessing
          ? "Video generating\u2026"
          : hasVideos
            ? `${count} video${count !== 1 ? "s" : ""} \u2013 Click to view`
            : "Convert to video"
      }
      aria-label={hasVideos || hasProcessing ? "Convert to video or view iterations" : "Convert to video"}
    >
      {hasProcessing ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 11-9-9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

/** @deprecated Use VideoIterationsStackGlow + VideoIterationsBarButton instead */
export function VideoIterationsStackHint({ outputId, onClick }: VideoIterationsStackHintProps) {
  void outputId;
  return (
    <>
      <VideoIterationsStackGlow count={0} hasProcessing={false} />
      <VideoIterationsBarButton count={0} hasProcessing={false} onClick={onClick} />
    </>
  );
}
