"use client";

import { useEffect, useRef } from "react";

type ClipboardImageCallback = (files: File[]) => void;

/**
 * Document-level paste listener that intercepts image/* clipboard items.
 * Works regardless of focus target — captures paste anywhere on the page.
 */
export function useClipboardImage(callback: ClipboardImageCallback | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!callbackRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      const active = document.activeElement;
      const isTextInput =
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLInputElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (isTextInput && !e.clipboardData?.types.every((t) => t === "Files" || t.startsWith("image/"))) {
        return;
      }

      e.preventDefault();
      callbackRef.current(imageFiles);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);
}
