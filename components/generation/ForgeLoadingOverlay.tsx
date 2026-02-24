"use client";

import styles from "./ForgeLoadingOverlay.module.css";

type ForgeLoadingOverlayProps = {
  message?: string;
};

const DEFAULT_MESSAGE = "Processing…";

export function ForgeLoadingOverlay({ message = DEFAULT_MESSAGE }: ForgeLoadingOverlayProps) {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.diamond} aria-hidden />
      <span className={styles.message}>{message}</span>
    </div>
  );
}
