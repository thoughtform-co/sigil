"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ImageGenNode } from "./nodes/ImageGenNode";
import { VideoGenNode } from "./nodes/VideoGenNode";
import { ImageInputNode } from "./nodes/ImageInputNode";
import { UpscaleNode } from "./nodes/UpscaleNode";
import { StyleTransferNode } from "./nodes/StyleTransferNode";
import { useCanvasStore } from "./stores/canvasStore";
import { useWorkflowExecution } from "./hooks/useWorkflowExecution";
import styles from "./CanvasWorkspace.module.css";

const nodeTypes = {
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
  imageInput: ImageInputNode,
  upscale: UpscaleNode,
  styleTransfer: StyleTransferNode,
};

function makeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type CanvasWorkspaceProps = {
  projectId: string;
  workflowId: string | null;
  workflowName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: Viewport;
  onGraphChange?: (nodes: Node[], edges: Edge[], viewport: Viewport) => void;
};

export function CanvasWorkspace({
  projectId,
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
  initialViewport,
  onGraphChange,
}: CanvasWorkspaceProps) {
  const {
    setProjectId,
    setWorkflow,
    nodes,
    edges,
    viewport,
    setNodes,
    setEdges,
    setViewport,
    setGraph,
  } = useCanvasStore();
  const lastWorkflowIdRef = useRef<string | null>(null);
  const { runWorkflow } = useWorkflowExecution();
  const [runBusy, setRunBusy] = useState(false);

  useEffect(() => {
    setProjectId(projectId);
    setWorkflow(workflowId, workflowName);
  }, [projectId, workflowId, workflowName, setProjectId, setWorkflow]);

  useEffect(() => {
    if (workflowId !== lastWorkflowIdRef.current) {
      lastWorkflowIdRef.current = workflowId;
      setGraph(
        initialNodes,
        initialEdges,
        initialViewport ?? { x: 0, y: 0, zoom: 1 }
      );
    }
  }, [workflowId, initialNodes, initialEdges, initialViewport, setGraph]);

  const addNode = useCallback(
    (type: "imageGen" | "videoGen" | "imageInput" | "upscale" | "styleTransfer") => {
      const id = makeId();
      const offset = nodes.length * 30;
      const baseData =
        type === "imageGen"
          ? { prompt: "", modelId: "", aspectRatio: "1:1", resolution: "4096" }
          : type === "videoGen"
            ? { prompt: "", modelId: "", duration: "5" }
            : type === "imageInput"
              ? { imageUrl: "" }
              : type === "upscale"
                ? { scale: "2" }
                : {};
      const newNode: Node = {
        id,
        type,
        position: { x: 100 + offset, y: 100 + (nodes.length * 20) % 200 },
        data: baseData,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onViewportChange = useCallback(
    (vp: Viewport) => {
      setViewport(vp);
    },
    [setViewport]
  );

  useEffect(() => {
    if (!onGraphChange) return;
    onGraphChange(nodes, edges, viewport);
  }, [nodes, edges, viewport, onGraphChange]);

  return (
    <div className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={onViewportChange}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--dawn-08)" />
        <Panel position="bottom-right" className={styles.controlsMinimapRow}>
          <Controls position="bottom-left" />
          <MiniMap position="bottom-right" nodeColor="var(--dawn-15)" maskColor="rgba(0,0,0,0.6)" />
        </Panel>
        <Panel position="bottom-center">
          <div className={styles.toolbar}>
            <span className={styles.toolbarTitle}>{workflowName || "Canvas"}</span>
            <span className={styles.toolbarSeparator} />
            <button
              type="button"
              className={styles.runWorkflowBtn}
              onClick={async () => {
                setRunBusy(true);
                try {
                  await runWorkflow();
                } finally {
                  setRunBusy(false);
                }
              }}
              disabled={!workflowId || runBusy || nodes.length === 0}
            >
              {runBusy ? "Running…" : "Run Workflow"}
            </button>
            <div className={styles.addNodeGroup}>
              <button
                type="button"
                className={styles.addNodeBtn}
                onClick={() => addNode("imageGen")}
                disabled={!workflowId}
              >
                + Image Gen
              </button>
              <button
                type="button"
                className={styles.addNodeBtn}
                onClick={() => addNode("videoGen")}
                disabled={!workflowId}
              >
                + Video Gen
              </button>
              <button
                type="button"
                className={styles.addNodeBtn}
                onClick={() => addNode("imageInput")}
                disabled={!workflowId}
              >
                + Image Input
              </button>
              <button
                type="button"
                className={styles.addNodeBtn}
                onClick={() => addNode("upscale")}
                disabled={!workflowId}
              >
                + Upscale
              </button>
              <button
                type="button"
                className={styles.addNodeBtn}
                onClick={() => addNode("styleTransfer")}
                disabled={!workflowId}
              >
                + Style Transfer
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
