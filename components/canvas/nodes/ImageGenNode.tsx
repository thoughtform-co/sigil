"use client";

import { useCallback, useEffect, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useCanvasStore } from "../stores/canvasStore";
import type { ModelItem } from "@/components/generation/types";
import styles from "./ImageGenNode.module.css";

export type ImageGenNodeData = {
  label?: string;
  status?: string;
  prompt?: string;
  modelId?: string;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrl?: string;
};

type ImageGenProps = NodeProps & { data: Record<string, unknown> };

export function ImageGenNode({ id, data: rawData, selected }: ImageGenProps) {
  const data = (rawData ?? {}) as ImageGenNodeData;
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setNodeResult = useCanvasStore((s) => s.setNodeResult);
  const result = useCanvasStore((s) => s.nodeResults[id as string]);
  const status = result?.status ?? data?.status ?? "idle";
  const [models, setModels] = useState<ModelItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const prompt = data?.prompt ?? "";
  const modelId = data?.modelId ?? "";
  const aspectRatio = data?.aspectRatio ?? "1:1";
  const resolution = data?.resolution ?? "4096";
  const referenceImageUrl = data?.referenceImageUrl ?? "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models?type=image", { cache: "no-store" })
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
    (updates: Partial<ImageGenNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data ?? {}), ...updates } } : n
        )
      );
    },
    [id, setNodes]
  );

  const projectId = useCanvasStore((s) => s.projectId);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const { getNode } = useReactFlow();

  const handleGenerateVideoFromThis = useCallback(() => {
    setContextMenu(null);
    const outputUrl = result?.outputUrl;
    if (!outputUrl) return;
    const currentNode = getNode(id as string);
    const pos = currentNode?.position ?? { x: 0, y: 0 };
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    useCanvasStore.getState().setNodes((nds) => [
      ...nds,
      {
        id: newId,
        type: "videoGen",
        position: { x: pos.x + 380, y: pos.y },
        data: { referenceImageUrl: outputUrl, prompt: "", modelId: "", duration: "5" },
      },
    ]);
    useCanvasStore.getState().setEdges((eds) => [
      ...eds,
      {
        id: `e-${id}-${newId}`,
        source: id as string,
        target: newId,
        sourceHandle: "image",
        targetHandle: "reference",
      },
    ]);
  }, [id, result?.outputUrl, getNode]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !modelId) return;
    if (!projectId) return;
    setBusy(true);
    setNodeResult(id as string, { status: "processing" });

    try {
      let sessionId: string;
      const sessionsRes = await fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" });
      const sessionsData = (await sessionsRes.json()) as { sessions?: Array<{ id: string; name: string }> };
      const canvasSession = sessionsData.sessions?.find((s) => s.name === "Canvas");
      if (canvasSession) {
        sessionId = canvasSession.id;
      } else {
        const createRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: "Canvas",
            type: "image",
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create Canvas session");
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
            aspectRatio,
            resolution: Number(resolution),
            numOutputs: 1,
            duration: 5,
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
        await new Promise((r) => setTimeout(r, 2000));
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
  }, [id, prompt, modelId, aspectRatio, resolution, referenceImageUrl, projectId, setNodeResult]);

  return (
    <BaseNode
      data={{
        ...data,
        status: status as "idle" | "processing" | "completed" | "failed",
      }}
      selected={selected}
      nodeType="Image Gen"
    >
      <div className={styles.fields}>
        <textarea
          className={`${styles.promptInput} nodrag`}
          value={prompt}
          onChange={(e) => updateData({ prompt: e.target.value })}
          placeholder="Describe what to generate…"
          rows={2}
          disabled={busy}
        />
        <div className={styles.refRow}>
          <span className={styles.refLabel}>Ref image</span>
          <input
            type="url"
            className={`${styles.refInput} nodrag`}
            value={referenceImageUrl}
            onChange={(e) => updateData({ referenceImageUrl: e.target.value })}
            placeholder="URL or paste"
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
            value={aspectRatio}
            onChange={(e) => updateData({ aspectRatio: e.target.value })}
            disabled={busy}
          >
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
          <select
            className={`${styles.select} nodrag`}
            value={resolution}
            onChange={(e) => updateData({ resolution: e.target.value })}
            disabled={busy}
          >
            <option value="1024">1K</option>
            <option value="2048">2K</option>
            <option value="4096">4K</option>
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
        <div
          className={styles.preview}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.outputUrl} alt="Output" className={styles.previewImg} />
        </div>
      )}
      {contextMenu && (
        <>
          <div
            className={styles.contextMenuBackdrop}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className={styles.contextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={handleGenerateVideoFromThis}
            >
              Generate Video from this
            </button>
          </div>
        </>
      )}
      {result?.error && <p className={styles.error}>{result.error}</p>}
      <Handle type="source" position={Position.Right} id="image" className={styles.handle} />
    </BaseNode>
  );
}
