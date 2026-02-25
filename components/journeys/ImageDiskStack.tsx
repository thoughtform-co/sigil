"use client";

import { useCallback, useState } from "react";
import styles from "./ImageDiskStack.module.css";

const STACK_LAYERS = 3;
const GLOW_COLOR = "202, 165, 84";

export type ImageDiskStackImage = {
  id: string;
  fileUrl: string;
  fileType: string;
  width: number | null;
  height: number | null;
};

type ImageDiskStackProps = {
  images: ImageDiskStackImage[];
  aspectRatio?: string;
  size?: "sm" | "md";
  /** When true, back layers use larger translateY offset for depth (e.g. in perspective-tilted view). */
  perspective?: boolean;
};

export function ImageDiskStack({
  images,
  aspectRatio = "3/4",
  size = "sm",
  perspective: usePerspectiveOffset = false,
}: ImageDiskStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const n = images.length;

  const goNext = useCallback(() => {
    if (n <= 1) return;
    setCurrentIndex((i) => (i + 1) % n);
  }, [n]);

  const goPrev = useCallback(() => {
    if (n <= 1) return;
    setCurrentIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  if (n === 0) {
    return (
      <div
        className={`${styles.wrapper} ${size === "md" ? styles.sizeMd : styles.sizeSm}`}
        style={{ aspectRatio }}
      >
        <div className={styles.stackContainer} style={{ aspectRatio }}>
          <div className={`${styles.card} ${styles.cardFront}`}>
            <div className={styles.cardImageWrap}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--surface-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--dawn-30)",
                  textTransform: "uppercase",
                }}
              >
                No images
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const backLayerCount = Math.min(STACK_LAYERS, n - 1);
  const getImageAtIndex = (idx: number) => images[idx % n]!;

  return (
    <div
      className={`${styles.wrapper} ${size === "md" ? styles.sizeMd : styles.sizeSm}`}
      style={{ aspectRatio }}
      role="group"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        goNext();
      }}
      onKeyDown={handleKeyDown}
      aria-label={`Image ${currentIndex + 1} of ${n}. Click or use arrows to cycle.`}
    >
      <div className={styles.stackContainer} style={{ aspectRatio }}>
        {/* Back layers (furthest to nearest) */}
        {Array.from({ length: backLayerCount }).map((_, i) => {
          const layerIndex = backLayerCount - 1 - i;
          const imageIndex = (currentIndex + layerIndex + 1) % n;
          const img = getImageAtIndex(imageIndex);
          const offsetY = (layerIndex + 1) * (usePerspectiveOffset ? 10 : 6);
          const scale = 1 - (layerIndex + 1) * 0.03;
          const opacity = 0.5 - layerIndex * 0.12;
          const shadowOpacity = 0.15 - layerIndex * 0.03;
          return (
            <div
              key={`back-${imageIndex}-${layerIndex}`}
              className={`${styles.card} ${styles.cardBack}`}
              style={{
                zIndex: layerIndex,
                transform: `translateY(${offsetY}px) scale(${scale})`,
                opacity,
                boxShadow: `0 ${(layerIndex + 1) * 4}px ${(layerIndex + 1) * 8}px rgba(${GLOW_COLOR}, ${shadowOpacity})`,
                borderColor: `rgba(${GLOW_COLOR}, ${opacity * 0.5})`,
              }}
            >
              <div className={styles.cardImageWrap}>
                {img.fileType.startsWith("video") ? (
                  <video
                    src={img.fileUrl}
                    className={styles.cardImage}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={img.fileUrl}
                    alt=""
                    className={styles.cardImage}
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Front card */}
        <div className={`${styles.card} ${styles.cardFront}`}>
          <span className={styles.cornerBrackets} aria-hidden />
          <div className={styles.cardImageWrap}>
            {(() => {
              const img = getImageAtIndex(currentIndex);
              return img.fileType.startsWith("video") ? (
                <video
                  src={img.fileUrl}
                  className={styles.cardImage}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={img.fileUrl}
                  alt=""
                  className={styles.cardImage}
                  loading="lazy"
                />
              );
            })()}
          </div>
        </div>
      </div>

      {n > 1 && (
        <span className={styles.positionIndicator} aria-hidden>
          {currentIndex + 1}/{n}
        </span>
      )}
    </div>
  );
}
