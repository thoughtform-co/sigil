"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { GenerationType, ModelItem } from "@/components/generation/types";
import styles from "./ForgePromptBar.module.css";

type ForgePromptBarProps = {
  generationType: GenerationType;
  onGenerationTypeChange: (type: GenerationType) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  referenceImageUrl: string;
  onReferenceImageUrlChange: (value: string) => void;
  modelId: string;
  onModelChange: (value: string) => void;
  models: ModelItem[];
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  numOutputs: string;
  onNumOutputsChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  activeSessionName: string | null | undefined;
  hasSession: boolean;
  onSubmit: () => void;
  onEnhance: () => void;
  busy: boolean;
  enhancing: boolean;
  message: string | null;
};

export function ForgePromptBar({
  generationType,
  onGenerationTypeChange,
  prompt,
  onPromptChange,
  referenceImageUrl,
  onReferenceImageUrlChange,
  modelId,
  onModelChange,
  models,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  numOutputs,
  onNumOutputsChange,
  duration,
  onDurationChange,
  activeSessionName,
  hasSession,
  onSubmit,
  onEnhance,
  busy,
  enhancing,
  message,
}: ForgePromptBarProps) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    referenceImageUrl && (referenceImageUrl.startsWith("data:") || referenceImageUrl.startsWith("blob:"))
      ? referenceImageUrl
      : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === modelId);
  const displayModelName = selectedModel ? selectedModel.name : modelId || "Model";

  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    const h = Math.min(Math.max(t.scrollHeight, 48), 200);
    t.style.height = `${h}px`;
  }, [prompt]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    if (showModelPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModelPicker]);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onReferenceImageUrlChange(dataUrl);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onReferenceImageUrlChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      const reader = new FileReader();
      reader.onload = () => {
        onReferenceImageUrlChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onReferenceImageUrlChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    onReferenceImageUrlChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onReferenceImageUrlChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void onSubmit();
    }
  };

  const canSubmit = hasSession && modelId && prompt.trim() && !busy;

  return (
    <div className={styles.promptBarContainer}>
      <div className={styles.promptBarWrapper}>
        <div className={styles.modelPickerContainer} ref={modelPickerRef}>
          <button
            type="button"
            className={styles.modelPickerButton}
            onClick={() => setShowModelPicker(!showModelPicker)}
            disabled={busy}
          >
            <span className={styles.modelPickerLabel}>{displayModelName}</span>
            <span className={styles.modelPickerChevron}>▼</span>
          </button>
          {showModelPicker && (
            <div className={styles.modelDropdown}>
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`${styles.modelOption} ${modelId === model.id ? styles.modelOptionActive : ""}`}
                  onClick={() => {
                    onModelChange(model.id);
                    setShowModelPicker(false);
                  }}
                >
                  {model.name}
                  {model.provider ? ` (${model.provider})` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.unifiedPromptContainer}>
          <div
            className={styles.imageZone}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={styles.fileInput}
            />
            {imagePreview || referenceImageUrl ? (
              <div className={styles.imagePreview}>
                <img
                  src={imagePreview || referenceImageUrl}
                  alt="Reference"
                  onError={() => setImagePreview(null)}
                />
                <button
                  type="button"
                  className={styles.clearImage}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearImage();
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className={styles.uploadPlaceholder}>
                <span className={styles.uploadIcon}>+</span>
                <span className={styles.uploadText}>IMAGE</span>
              </div>
            )}
          </div>

          <div className={styles.promptAndParams}>
            <div className={styles.promptTextArea}>
              <textarea
                ref={textareaRef}
                id="forge-prompt-bar-prompt"
                className={styles.promptInput}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to generate… (Ctrl+Enter to generate)"
                rows={1}
                disabled={busy}
              />
              {showUrlInput && (
                <div className={styles.urlRow}>
                  <input
                    type="url"
                    value={referenceImageUrl}
                    onChange={(e) => onReferenceImageUrlChange(e.target.value)}
                    className={styles.refInput}
                    placeholder="Paste reference image URL"
                    aria-label="Reference image URL"
                  />
                </div>
              )}
              {!showUrlInput && (
                <button
                  type="button"
                  className={styles.urlToggle}
                  onClick={() => setShowUrlInput(true)}
                >
                  or paste URL
                </button>
              )}
            </div>

            <div className={styles.paramsRow}>
              <div className={styles.durationToggle} role="group" aria-label="Mode">
                <button
                  type="button"
                  className={`${styles.paramButton} ${generationType === "image" ? styles.paramActive : ""}`}
                  onClick={() => onGenerationTypeChange("image")}
                  disabled={busy}
                >
                  IMAGE
                </button>
                <button
                  type="button"
                  className={`${styles.paramButton} ${generationType === "video" ? styles.paramActive : ""}`}
                  onClick={() => onGenerationTypeChange("video")}
                  disabled={busy}
                >
                  VIDEO
                </button>
              </div>
              <select
                value={aspectRatio}
                onChange={(e) => onAspectRatioChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Aspect ratio"
                disabled={busy}
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
              <select
                value={resolution}
                onChange={(e) => onResolutionChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Resolution"
                disabled={busy}
              >
                <option value="1024">1K</option>
                <option value="2048">2K</option>
                <option value="4096">4K</option>
              </select>
              <select
                value={numOutputs}
                onChange={(e) => onNumOutputsChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Outputs"
                disabled={busy}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              {generationType === "video" && (
                <div className={styles.durationToggle} role="group" aria-label="Duration">
                  <button
                    type="button"
                    className={`${styles.durationBtn} ${duration === "5" ? styles.durationActive : ""}`}
                    onClick={() => onDurationChange("5")}
                    disabled={busy}
                  >
                    5s
                  </button>
                  <button
                    type="button"
                    className={`${styles.durationBtn} ${duration === "10" ? styles.durationActive : ""}`}
                    onClick={() => onDurationChange("10")}
                    disabled={busy}
                  >
                    10s
                  </button>
                </div>
              )}
              <button
                type="button"
                className={styles.paramButton}
                disabled={enhancing || !prompt.trim() || !modelId || busy}
                onClick={() => void onEnhance()}
              >
                {enhancing ? "…" : "Enhance"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.generateButton}
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
          >
            {busy ? (
              <span className={styles.generating}>
                <span className={styles.spinner} />
              </span>
            ) : (
              <span className={styles.generateIcon}>▶</span>
            )}
          </button>
        </div>
      </div>
      {message && <p className={styles.message} role="status">{message}</p>}
    </div>
  );
}
