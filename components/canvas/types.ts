/** Types for canvas workflow UI and API. */

export type WorkflowItem = {
  id: string;
  name: string;
  description: string | null;
  graphData: GraphData;
  createdAt: string;
  updatedAt: string;
};

export type GraphData = {
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
  viewport?: { x: number; y: number; zoom: number };
};
