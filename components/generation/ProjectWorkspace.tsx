"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainstormPanel } from "@/components/generation/BrainstormPanel";
import { SessionBar, type SessionItem } from "@/components/generation/SessionBar";
import { GenerationGallery, type GenerationItem } from "@/components/generation/GenerationGallery";
import { PromptBar, type ModelItem } from "@/components/generation/PromptBar";

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
    if (!generations.some((g) => g.status === "processing" || g.status === "processing_locked")) return;
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
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const compatibleModels = useMemo(() => {
    if (!activeSession) return models;
    return models.filter((m) => m.type === activeSession.type);
  }, [activeSession, models]);

  useEffect(() => {
    if (!compatibleModels.length) return;
    if (compatibleModels.some((m) => m.id === modelId)) return;
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
            ? { referenceImageUrl: referenceImageUrl.trim(), aspectRatio, resolution: Number(resolution), numOutputs: Number(numOutputs), duration: Number(duration) }
            : { aspectRatio, resolution: Number(resolution), numOutputs: Number(numOutputs), duration: Number(duration) },
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
        body: JSON.stringify({ prompt: prompt.trim(), modelId, referenceImageUrl: referenceImageUrl.trim() || undefined }),
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
      const response = await fetch(`/api/generations/${generationId}/retry`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Failed to retry generation");
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
    if (typeof params.resolution === "number" || typeof params.resolution === "string") setResolution(String(params.resolution));
    if (typeof params.numOutputs === "number" || typeof params.numOutputs === "string") setNumOutputs(String(params.numOutputs));
    if (typeof params.duration === "number" || typeof params.duration === "string") setDuration(String(params.duration));
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
      const remaining = sessions.filter((s) => s.id !== sessionId);
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
    <div className="workspace-container">
      <div className="workspace-body">
        <SessionBar
          sessions={sessions}
          activeSessionId={selectedSessionId}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          onSessionSelect={setSelectedSessionId}
          onSessionCreate={createSession}
          onSessionDelete={deleteSession}
          onProjectRename={renameProject}
          busy={busy}
        />
        <div className="workspace-main">
          <GenerationGallery
            generations={generations}
            onRetry={retryGeneration}
            onReuse={reuseGeneration}
            onApprove={toggleApproveOutput}
            onDeleteOutput={deleteOutput}
            busy={busy}
          />
          <PromptBar
            prompt={prompt}
            onPromptChange={setPrompt}
            referenceImageUrl={referenceImageUrl}
            onReferenceImageUrlChange={setReferenceImageUrl}
            modelId={modelId}
            onModelChange={setModelId}
            models={compatibleModels}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            resolution={resolution}
            onResolutionChange={setResolution}
            numOutputs={numOutputs}
            onNumOutputsChange={setNumOutputs}
            duration={duration}
            onDurationChange={setDuration}
            activeSessionName={activeSession?.name}
            hasSession={!!selectedSessionId}
            onSubmit={submitGeneration}
            onEnhance={enhancePrompt}
            busy={busy}
            enhancing={enhancing}
            message={message}
          />
        </div>
      </div>
      <BrainstormPanel projectId={projectId} />
    </div>
  );
}
