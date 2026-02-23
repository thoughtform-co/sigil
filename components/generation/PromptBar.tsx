"use client";

export type ModelItem = {
  id: string;
  name: string;
  type: "image" | "video";
  provider: string;
};

type PromptBarProps = {
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

const labelStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--dawn-50)",
};

export function PromptBar({
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
}: PromptBarProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void onSubmit();
    }
  }

  return (
    <div className="sigil-prompt-bar border-t-2 border-[var(--gold)] bg-[var(--surface-1)] p-4 shrink-0">
      <div className="mb-2 flex items-center gap-2">
        <label htmlFor="promptBar-modelSelect" style={labelStyle}>
          model
        </label>
        <select
          id="promptBar-modelSelect"
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          className="sigil-select flex-1 min-w-0"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <select
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value)}
          className="sigil-select"
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
          className="sigil-select"
        >
          <option value="1024">1K</option>
          <option value="2048">2K</option>
          <option value="4096">4K</option>
        </select>
        <select
          value={numOutputs}
          onChange={(e) => onNumOutputsChange(e.target.value)}
          className="sigil-select"
        >
          <option value="1">1 output</option>
          <option value="2">2 outputs</option>
          <option value="3">3 outputs</option>
          <option value="4">4 outputs</option>
        </select>
        <select
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
          className="sigil-select"
        >
          <option value="5">5s</option>
          <option value="10">10s</option>
        </select>
      </div>
      <label htmlFor="promptBar-prompt" style={labelStyle}>
        prompt ({activeSessionName ?? "no session selected"})
      </label>
      <div className="mt-2 flex gap-2 flex-wrap">
        <textarea
          id="promptBar-prompt"
          className="sigil-textarea flex-1 min-w-[200px] resize-y"
          rows={3}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what to generate... (Ctrl+Enter to generate)"
        />
        <div className="flex gap-2 shrink-0 items-end">
          <button
            type="button"
            className="sigil-btn-primary disabled:opacity-50"
            disabled={busy || !hasSession || !modelId || !prompt.trim()}
            onClick={() => void onSubmit()}
          >
            {busy ? "working…" : "generate"}
          </button>
          <button
            type="button"
            className="sigil-btn-ghost disabled:opacity-50"
            disabled={enhancing || !prompt.trim() || !modelId}
            onClick={() => void onEnhance()}
          >
            {enhancing ? "enhancing…" : "enhance"}
          </button>
        </div>
      </div>
      <div className="mt-2">
        <input
          type="text"
          value={referenceImageUrl}
          onChange={(e) => onReferenceImageUrlChange(e.target.value)}
          className="sigil-input text-xs"
          placeholder="Optional reference image URL (for image models)"
        />
      </div>
      {message ? (
        <p className="mt-2 text-xs text-[var(--dawn-50)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
