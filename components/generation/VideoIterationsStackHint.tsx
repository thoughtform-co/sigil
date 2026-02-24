"use client";

import { useVideoIterations } from "@/hooks/useVideoIterations";
import styles from "./VideoIterationsStackHint.module.css";

type VideoIterationsStackHintProps = {
  outputId: string;
  onClick?: () => void;
};

const STACK_LAYERS = 3;
const GLOW_COLOR = "91, 138, 122"; /* --status-success #5b8a7a */

export function VideoIterationsStackHint({ outputId, onClick }: VideoIterationsStackHintProps) {
  const { count, hasProcessing } = useVideoIterations(outputId, { limit: 10, enabled: true });
  const hasVideos = count > 0;
  const showStackEffect = hasVideos || hasProcessing;

  return (
    <>
      {showStackEffect && (
        <div
          className={`${styles.wrapper} ${hasProcessing ? styles.pulsing : ""}`}
          aria-hidden
        >
          {Array.from({ length: STACK_LAYERS }).map((_, index) => {
            const layerIndex = STACK_LAYERS - index - 1;
            const offset = (layerIndex + 1) * 8;
            const verticalOffset = offset * 0.3;
            const baseOpacity = hasProcessing ? 0.2 : 0.15;
            const opacity = baseOpacity - layerIndex * 0.03;
            const scale = 1 - layerIndex * 0.02;
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
                  background: `linear-gradient(to left, rgba(${GLOW_COLOR}, ${opacity * 0.35}) 0%, rgba(${GLOW_COLOR}, ${opacity * 0.18}) 45%, transparent 85%)`,
                  border: `1.5px solid rgba(${GLOW_COLOR}, ${opacity * 0.8})`,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  boxShadow: `${offset}px 0 ${offset * 2}px -${offset * 0.65}px rgba(${GLOW_COLOR}, ${opacity * 0.55}), inset 10px 0 ${12 + layerIndex * 2}px rgba(${GLOW_COLOR}, ${opacity * 0.25})`,
                }}
              />
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={`${styles.iconButton} ${showStackEffect ? styles.visible : styles.hiddenUntilHover} ${hasProcessing ? styles.spin : ""} video-stack-hint-btn`}
        data-hidden-until-hover={!showStackEffect ? "true" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        title={
          hasProcessing
            ? "Video generating…"
            : hasVideos
              ? `${count} video${count !== 1 ? "s" : ""} – Click to view`
              : "Convert to video"
        }
        aria-label={showStackEffect ? "Convert to video or view iterations" : "Convert to video"}
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
    </>
  );
}
