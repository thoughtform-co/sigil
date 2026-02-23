"use client";

import { ReactNode, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])";

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    },
    [open, onClose]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const focusable = getFocusableElements(panel);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
    return () => {
      if (previousActiveRef.current?.focus) {
        previousActiveRef.current.focus();
      }
    };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open || typeof document === "undefined") return null;

  const dialog = (
    <div
      className="sigil-dialog-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="sigil-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sigil-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          id="sigil-dialog-title"
          className="sigil-section-label"
          style={{
            padding: "var(--space-lg) var(--space-xl)",
            borderBottom: "1px solid var(--dawn-08)",
          }}
        >
          {title}
        </header>
        <div style={{ padding: "var(--space-xl)" }}>{children}</div>
        {footer != null ? (
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "var(--space-sm)",
              padding: "var(--space-md) var(--space-xl) var(--space-xl)",
              borderTop: "1px solid var(--dawn-08)",
            }}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
