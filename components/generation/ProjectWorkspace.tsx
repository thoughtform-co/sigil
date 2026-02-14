"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainstormPanel } from "@/components/generation/BrainstormPanel";

type SessionItem = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
};

type ModelItem = {
  id: string;
  name: string;
  type: "image" | "video";
  provider: string;
};

type OutputItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  isApproved?: boolean;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

type GenerationItem = {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs: OutputItem[];
};

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1024");
  const [numOutputs, setNumOutputs] = useState("1");
  const [duration, setDuration] = useState("5");
  const [modelId, setModelId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { projects: Array<{ id: string; name: string }> };
      const found = data.projects.find((project) => project.id === projectId);
      if (found) setProjectName(found.name);
    }
    void loadProject();
  }, [projectId]);

  useEffect(() => {
    async function loadModels() {
      const response = await fetch("/api/models", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { models: ModelItem[] };
      setModels(data.models);
      setModelId((prev) => {
        if (prev || data.models.length === 0) return prev;
        const firstImageModel = data.models.find((m) => m.type === "image");
        return (firstImageModel || data.models[0]).id;
      });
    }

    void loadModels();
  }, []);

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { sessions: SessionItem[] };
      setSessions(data.sessions);
      if (data.sessions.length > 0) {
        setSelectedSessionId((prev) => prev ?? data.sessions[0].id);
      }
    }
    void loadSessions();
  }, [projectId]);

  useEffect(() => {
    async function loadGenerations() {
      if (!selectedSessionId) return;
      const response = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { generations: GenerationItem[] };
      setGenerations(data.generations);
    }
    void loadGenerations();
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    if (!generations.some((generation) => generation.status === "processing" || generation.status === "processing_locked")) return;

    const interval = setInterval(() => {
      void (async () => {
        const response = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { generations: GenerationItem[] };
        setGenerations(data.generations);
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [generations, selectedSessionId]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const compatibleModels = useMemo(() => {
    if (!activeSession) return models;
    return models.filter((model) => model.type === activeSession.type);
  }, [activeSession, models]);

  useEffect(() => {
    if (!compatibleModels.length) return;
    if (compatibleModels.some((model) => model.id === modelId)) return;
    setModelId(compatibleModels[0].id);
  }, [compatibleModels, modelId]);

  async function createSession(type: "image" | "video") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: `${type === "image" ? "Image" : "Video"} Session ${sessions.length + 1}`,
          type,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create session");
      const created = data.session as SessionItem;
      setSessions((prev) => [created, ...prev]);
      setSelectedSessionId(created.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setBusy(false);
    }
  }

  async function submitGeneration() {
    if (!selectedSessionId || !prompt.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          modelId,
          prompt: prompt.trim(),
          parameters: referenceImageUrl.trim()
            ? {
                referenceImageUrl: referenceImageUrl.trim(),
                aspectRatio,
                resolution: Number(resolution),
                numOutputs: Number(numOutputs),
                duration: Number(duration),
              }
            : {
                aspectRatio,
                resolution: Number(resolution),
                numOutputs: Number(numOutputs),
                duration: Number(duration),
              },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to submit generation");

      setPrompt("");
      setReferenceImageUrl("");
      setMessage(`Generation queued: ${data.generation.id}`);

      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
      if (refresh.ok) {
        const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
        setGenerations(refreshed.generations);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit generation");
    } finally {
      setBusy(false);
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim() || !modelId) return;
    setEnhancing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId,
          referenceImageUrl: referenceImageUrl.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to enhance prompt");
      if (typeof data.enhancedPrompt === "string" && data.enhancedPrompt.trim()) {
        setPrompt(data.enhancedPrompt.trim());
        setMessage("Prompt enhanced.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to enhance prompt");
    } finally {
      setEnhancing(false);
    }
  }

  async function retryGeneration(generationId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/generations/${generationId}/retry`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to retry generation");
      }
      setMessage(`Retry queued: ${generationId}`);
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to retry generation");
    } finally {
      setBusy(false);
    }
  }

  async function toggleApproveOutput(outputId: string, isApproved: boolean) {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to update output");
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update output");
    }
  }

  async function deleteOutput(outputId: string) {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to delete output");
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, { cache: "no-store" });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete output");
    }
  }

  function reuseGeneration(generation: GenerationItem) {
    setPrompt(generation.prompt);
    setModelId(generation.modelId);
    const params = generation.parameters ?? {};
    if (typeof params.aspectRatio === "string") setAspectRatio(params.aspectRatio);
    if (typeof params.resolution === "number" || typeof params.resolution === "string")
      setResolution(String(params.resolution));
    if (typeof params.numOutputs === "number" || typeof params.numOutputs === "string")
      setNumOutputs(String(params.numOutputs));
    if (typeof params.duration === "number" || typeof params.duration === "string")
      setDuration(String(params.duration));
    if (typeof params.referenceImageUrl === "string") setReferenceImageUrl(params.referenceImageUrl);
    setMessage("Parameters loaded from previous generation.");
  }

  async function renameProject() {
    if (!projectName.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to rename project");
      setMessage("Project renamed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to rename project");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSession(sessionId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to delete session");

      const remaining = sessions.filter((session) => session.id !== sessionId);
      setSessions(remaining);
      setSelectedSessionId(remaining[0]?.id ?? null);
      setGenerations([]);
      setMessage("Session deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
        <div className="mb-3 flex gap-2">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            placeholder="Project name"
          />
          <button
            type="button"
            onClick={() => {
              void renameProject();
            }}
            disabled={busy || !projectName.trim()}
            className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            rename
          </button>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-50)",
          }}
        >
          sessions
        </h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void createSession("image");
            }}
            className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            + image
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void createSession("video");
            }}
            className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            + video
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedSessionId(session.id)}
              className={`w-full border px-2 py-2 text-left text-xs ${
                selectedSessionId === session.id
                  ? "border-[var(--gold)] text-[var(--gold)]"
                  : "border-[var(--dawn-08)] text-[var(--dawn-50)]"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <div className="uppercase tracking-[0.08em]">{session.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] opacity-70">{session.type}</div>
              <div className="mt-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteSession(session.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      void deleteSession(session.id);
                    }
                  }}
                  className="inline-block text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-30)] hover:text-[var(--gold)]"
                >
                  delete session
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="grid gap-4">
        <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn-50)",
            }}
          >
            generation gallery
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {generations.length === 0 ? (
              <div className="border border-dashed border-[var(--dawn-15)] p-4 text-sm text-[var(--dawn-30)]">
                No generations yet for this session.
              </div>
            ) : (
              generations.map((generation) => (
                <div key={generation.id} className="border border-[var(--dawn-08)] p-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]">
                    <span>
                      {(generation.status === "processing_locked" ? "processing" : generation.status)} - {generation.modelId}
                    </span>
                    {generation.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => {
                          void retryGeneration(generation.id);
                        }}
                        disabled={busy}
                        className="border border-[var(--gold)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)] disabled:opacity-50"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        retry
                      </button>
                    ) : null}
                  </div>
                  <div className="mb-2 text-sm text-[var(--dawn)]">{generation.prompt}</div>
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => reuseGeneration(generation)}
                      className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] hover:text-[var(--gold)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      reuse params
                    </button>
                  </div>
                  <div className="space-y-2">
                    {generation.outputs.map((output) => (
                      <div key={output.id} className="border border-[var(--dawn-08)] p-2">
                        {output.fileType === "video" ? (
                          <video className="h-44 w-full object-cover" controls src={output.fileUrl} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="h-44 w-full object-cover" src={output.fileUrl} alt="Generated output" />
                        )}
                        <a
                          href={output.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-xs text-[var(--gold)] underline-offset-2 hover:underline"
                        >
                          open source
                        </a>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void toggleApproveOutput(output.id, !output.isApproved);
                            }}
                            className={`border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${
                              output.isApproved
                                ? "border-emerald-300 text-emerald-300"
                                : "border-[var(--dawn-15)] text-[var(--dawn-50)]"
                            }`}
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {output.isApproved ? "approved" : "approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteOutput(output.id);
                            }}
                            className="border border-[var(--dawn-15)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)] hover:text-red-300"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-[var(--gold)] bg-[var(--surface-0)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="modelSelect"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dawn-50)",
              }}
            >
              model
            </label>
            <select
              id="modelSelect"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            >
              {compatibleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            >
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            >
              <option value="1024">1K</option>
              <option value="2048">2K</option>
              <option value="4096">4K</option>
            </select>
            <select
              value={numOutputs}
              onChange={(e) => setNumOutputs(e.target.value)}
              className="border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            >
              <option value="1">1 output</option>
              <option value="2">2 outputs</option>
              <option value="3">3 outputs</option>
              <option value="4">4 outputs</option>
            </select>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border border-[var(--dawn-15)] bg-[var(--void)] px-2 py-1 text-xs text-[var(--dawn)] outline-none"
            >
              <option value="5">5s</option>
              <option value="10">10s</option>
            </select>
          </div>
          <label
            htmlFor="prompt"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn-50)",
            }}
          >
            prompt ({activeSession?.name ?? "no session selected"})
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-sm text-[var(--dawn)] outline-none"
              placeholder="Describe what to generate..."
            />
            <button
              className="border border-[var(--gold)] px-4 py-2 text-xs uppercase tracking-[0.08em] text-[var(--gold)] disabled:opacity-50"
              style={{ fontFamily: "var(--font-mono)" }}
              type="button"
              disabled={busy || !selectedSessionId || !modelId || !prompt.trim()}
              onClick={() => {
                void submitGeneration();
              }}
            >
              {busy ? "working..." : "generate"}
            </button>
            <button
              className="border border-[var(--dawn-15)] px-4 py-2 text-xs uppercase tracking-[0.08em] text-[var(--dawn-50)] disabled:opacity-50"
              style={{ fontFamily: "var(--font-mono)" }}
              type="button"
              disabled={enhancing || !prompt.trim() || !modelId}
              onClick={() => {
                void enhancePrompt();
              }}
            >
              {enhancing ? "enhancing..." : "enhance"}
            </button>
          </div>
          <div className="mt-2">
            <input
              value={referenceImageUrl}
              onChange={(e) => setReferenceImageUrl(e.target.value)}
              className="w-full border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-xs text-[var(--dawn)] outline-none"
              placeholder="Optional reference image URL (for image models)"
            />
          </div>
          {message ? <p className="mt-2 text-xs text-[var(--dawn-50)]">{message}</p> : null}
        </div>

        <BrainstormPanel projectId={projectId} />
      </div>
    </section>
  );
}
