"use client";

import { useCallback, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useCanvasStore } from "../stores/canvasStore";
import type { ModelItem } from "@/components/generation/types";
import styles from "./ImageGenNode.module.css";

export type VideoGenNodeData = {
  label?: string;
  status?: string;
  prompt?: string;
  modelId?: string;
  duration?: string;
  referenceImageUrl?: string;
};

type VideoGenProps = NodeProps & { data: Record<string, unknown> };

export function VideoGenNode({ id, data: rawData, selected }: VideoGenProps) {
  const data = (rawData ?? {}) as VideoGenNodeData;
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setNodeResult = useCanvasStore((s) => s.setNodeResult);
  const result = useCanvasStore((s) => s.nodeResults[id as string]);
  const status = result?.status ?? data?.status ?? "idle";
  const [models, setModels] = useState<ModelItem[]>([]);
  const [busy, setBusy] = useState(false);

  const prompt = data?.prompt ?? "";
  const modelId = data?.modelId ?? "";
  const duration = data?.duration ?? "5";
  const referenceImageUrl = data?.referenceImageUrl ?? "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models?type=video", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { models?: ModelItem[] }) => {
        if (!cancelled && body.models?.length) {
          setModels(body.models);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateData = useCallback(
    (updates: Partial<VideoGenNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data ?? {}), ...updates } } : n
        )
      );
    },
    [id, setNodes]
  );

  const projectId = useCanvasStore((s) => s.projectId);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !modelId) return;
    if (!projectId) return;
    setBusy(true);
    setNodeResult(id as string, { status: "processing" });

    try {
      let sessionId: string;
      const sessionsRes = await fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" });
      const sessionsData = (await sessionsRes.json()) as { sessions?: Array<{ id: string; name: string }> };
      const canvasVideoSession = sessionsData.sessions?.find((s) => s.name === "Canvas Video");
      if (canvasVideoSession) {
        sessionId = canvasVideoSession.id;
      } else {
        const createRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: "Canvas Video",
            type: "video",
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create Canvas Video session");
        const createData = (await createRes.json()) as { session?: { id: string } };
        sessionId = createData.session!.id;
      }

      let resolvedRef = referenceImageUrl.trim() || undefined;
      if (resolvedRef?.startsWith("data:")) {
        const uploadRes = await fetch("/api/upload/reference-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: resolvedRef, projectId }),
        });
        if (uploadRes.ok) {
          const uploadData = (await uploadRes.json()) as { referenceImageUrl?: string };
          resolvedRef = uploadData.referenceImageUrl ?? resolvedRef;
        }
      }

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          modelId,
          prompt: prompt.trim(),
          parameters: {
            aspectRatio: "16:9",
            resolution: 2048,
            numOutputs: 1,
            duration: Number(duration),
            ...(resolvedRef && { referenceImageUrl: resolvedRef }),
          },
        }),
      });
      const genData = (await genRes.json()) as { generation?: { id: string }; error?: string };
      if (!genRes.ok) throw new Error(genData.error ?? "Generate failed");
      const generationId = genData.generation!.id;

      const poll = async (): Promise<string> => {
        const listRes = await fetch(`/api/generations?sessionId=${sessionId}`, { cache: "no-store" });
        const listData = (await listRes.json()) as { generations?: Array<{ id: string; status: string; outputs: Array<{ fileUrl: string }> }> };
        const gen = listData.generations?.find((g) => g.id === generationId);
        if (gen?.status === "completed" && gen.outputs?.[0]?.fileUrl) return gen.outputs[0].fileUrl;
        if (gen?.status === "failed") throw new Error("Generation failed");
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      };
      const outputUrl = await poll();
      setNodeResult(id as string, { status: "completed", outputUrl });
    } catch (err) {
      setNodeResult(id as string, {
        status: "failed",
        error: err instanceof Error ? err.message : "Generation failed",
      });
    } finally {
      setBusy(false);
    }
  }, [id, prompt, modelId, duration, referenceImageUrl, projectId, setNodeResult]);

  return (
    <BaseNode
      data={{
        ...data,
        status: status as "idle" | "processing" | "completed" | "failed",
      }}
      selected={selected}
      nodeType="Video Gen"
    >
      <div className={styles.fields}>
        <textarea
          className={`${styles.promptInput} nodrag`}
          value={prompt}
          onChange={(e) => updateData({ prompt: e.target.value })}
          placeholder="Describe the video…"
          rows={2}
          disabled={busy}
        />
        <div className={styles.refRow}>
          <span className={styles.refLabel}>Ref image / video</span>
          <input
            type="url"
            className={`${styles.refInput} nodrag`}
            value={referenceImageUrl}
            onChange={(e) => updateData({ referenceImageUrl: e.target.value })}
            placeholder="URL"
            disabled={busy}
          />
        </div>
        <div className={styles.paramsRow}>
          <select
            className={`${styles.select} nodrag`}
            value={modelId}
            onChange={(e) => updateData({ modelId: e.target.value })}
            disabled={busy}
          >
            <option value="">Model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            className={`${styles.select} nodrag`}
            value={duration}
            onChange={(e) => updateData({ duration: e.target.value })}
            disabled={busy}
          >
            <option value="5">5s</option>
            <option value="10">10s</option>
          </select>
        </div>
        <button
          type="button"
          className={styles.generateBtn}
          onClick={() => void handleGenerate()}
          disabled={busy || !prompt.trim() || !modelId}
        >
          {busy ? "…" : "Generate"}
        </button>
      </div>
      {result?.outputUrl && (
        <div className={styles.preview}>
          {result.outputUrl.match(/\.(webm|mp4|mov)$/i) ? (
            <video src={result.outputUrl} controls className={styles.previewImg} />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={result.outputUrl} alt="Output" className={styles.previewImg} />
          )}
        </div>
      )}
      {result?.error && <p className={styles.error}>{result.error}</p>}
      <Handle type="target" position={Position.Left} id="reference" className={styles.handle} />
      <Handle type="source" position={Position.Right} id="video" className={styles.handle} />
    </BaseNode>
  );
}
