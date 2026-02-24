"use client";

import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useCanvasStore } from "../stores/canvasStore";

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree: Record<string, number> = {};
  const outEdges: Record<string, string[]> = {};
  for (const n of nodes) {
    inDegree[n.id] = 0;
    outEdges[n.id] = [];
  }
  for (const e of edges) {
    outEdges[e.source] = outEdges[e.source] ?? [];
    outEdges[e.source].push(e.target);
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
  }
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of outEdges[u] ?? []) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }
  const orderSet = new Set(order);
  const rest = nodes.filter((n) => !orderSet.has(n.id));
  return [...order.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean), ...rest];
}

export function useWorkflowExecution() {
  const { nodes, edges, setNodeResult, nodeResults, projectId, workflowId } = useCanvasStore();

  const runWorkflow = useCallback(async () => {
    let workflowExecutionId: string | undefined;
    if (workflowId) {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/executions`, { method: "POST" });
        const data = (await res.json()) as { execution?: { id: string } };
        if (data.execution?.id) workflowExecutionId = data.execution.id;
      } catch {
        // continue without execution id
      }
    }

    const ordered = topologicalSort(nodes, edges);
    const getInputUrl = (nodeId: string): string | undefined => {
      const incoming = edges.filter((e) => e.target === nodeId && e.targetHandle === "reference");
      const srcId = incoming[0]?.source;
      if (!srcId) return undefined;
      return nodeResults[srcId]?.outputUrl;
    };

    for (const node of ordered) {
      const type = node.type ?? "unknown";
      if (type === "imageInput") {
        const url = (node.data as { imageUrl?: string })?.imageUrl;
        if (url) setNodeResult(node.id, { status: "completed", outputUrl: url });
        continue;
      }
      if (type === "imageGen" || type === "videoGen") {
        const refUrl = getInputUrl(node.id);
        const data = node.data as Record<string, unknown>;
        const prompt = (data?.prompt as string)?.trim();
        const modelId = (data?.modelId as string)?.trim();
        if (!prompt || !modelId) continue;
        setNodeResult(node.id, { status: "processing" });
        try {
          const sessionType = type === "videoGen" ? "video" : "image";
          const sessionName = sessionType === "video" ? "Canvas Video" : "Canvas";
          let sessionId: string;
          const sessionsRes = await fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" });
          const sessionsData = (await sessionsRes.json()) as { sessions?: Array<{ id: string; name: string }> };
          const session = sessionsData.sessions?.find((s) => s.name === sessionName);
          if (session) sessionId = session.id;
          else {
            const createRes = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId, name: sessionName, type: sessionType }),
            });
            const createData = (await createRes.json()) as { session?: { id: string } };
            if (!createRes.ok) throw new Error("Failed to create session");
            sessionId = createData.session!.id;
          }
          const parameters: Record<string, unknown> = {
            aspectRatio: data?.aspectRatio ?? "1:1",
            resolution: Number(data?.resolution ?? 4096),
            numOutputs: 1,
            duration: Number(data?.duration ?? 5),
          };
          const ref = (refUrl ?? (data?.referenceImageUrl as string) ?? "").trim();
          if (ref) parameters.referenceImageUrl = ref;
          const genRes = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              modelId,
              prompt,
              parameters,
              ...(workflowExecutionId && { source: "workflow" as const, workflowExecutionId }),
            }),
          });
          const genData = (await genRes.json()) as { generation?: { id: string }; error?: string };
          if (!genRes.ok) throw new Error(genData.error ?? "Generate failed");
          const generationId = genData.generation!.id;
          const poll = async (): Promise<string> => {
            const listRes = await fetch(`/api/generations?sessionId=${sessionId}`, { cache: "no-store" });
            const listData = (await listRes.json()) as {
              generations?: Array<{ id: string; status: string; outputs: Array<{ fileUrl: string }> }>;
            };
            const gen = listData.generations?.find((g) => g.id === generationId);
            if (gen?.status === "completed" && gen.outputs?.[0]?.fileUrl) return gen.outputs[0].fileUrl;
            if (gen?.status === "failed") throw new Error("Generation failed");
            await new Promise((r) => setTimeout(r, type === "videoGen" ? 3000 : 2000));
            return poll();
          };
          const outputUrl = await poll();
          setNodeResult(node.id, { status: "completed", outputUrl });
        } catch (err) {
          setNodeResult(node.id, {
            status: "failed",
            error: err instanceof Error ? err.message : "Failed",
          });
        }
      }
    }
  }, [nodes, edges, nodeResults, projectId, setNodeResult, workflowId]);

  return { runWorkflow };
}
