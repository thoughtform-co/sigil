import { create } from "zustand";
import type { Node, Edge, Viewport } from "@xyflow/react";

type CanvasState = {
  projectId: string;
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  setProjectId: (id: string) => void;
  setWorkflow: (id: string | null, name: string) => void;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setViewport: (viewport: Viewport) => void;
  setGraph: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
  /** Per-node execution state: nodeId -> { status, outputUrl?, error? } */
  nodeResults: Record<string, { status: string; outputUrl?: string; error?: string }>;
  setNodeResult: (nodeId: string, result: { status: string; outputUrl?: string; error?: string }) => void;
  clearNodeResult: (nodeId: string) => void;
};

export const useCanvasStore = create<CanvasState>((set) => ({
  projectId: "",
  workflowId: null,
  workflowName: "",
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  setProjectId: (projectId) => set({ projectId }),
  setWorkflow: (workflowId, workflowName) =>
    set({ workflowId, workflowName }),
  setNodes: (nodesOrUpdater) =>
    set((state) => ({
      nodes: typeof nodesOrUpdater === "function" ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    })),
  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: typeof edgesOrUpdater === "function" ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    })),
  setViewport: (viewport) => set({ viewport }),
  setGraph: (nodes, edges, viewport) =>
    set((state) => ({
      nodes,
      edges,
      ...(viewport !== undefined && { viewport }),
    })),
  nodeResults: {},
  setNodeResult: (nodeId, result) =>
    set((state) => ({
      nodeResults: { ...state.nodeResults, [nodeId]: result },
    })),
  clearNodeResult: (nodeId) =>
    set((state) => {
      const next = { ...state.nodeResults };
      delete next[nodeId];
      return { nodeResults: next };
    }),
}));
