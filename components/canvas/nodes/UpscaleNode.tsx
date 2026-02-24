"use client";

import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useCanvasStore } from "../stores/canvasStore";
import styles from "./ImageGenNode.module.css";

export type UpscaleNodeData = {
  label?: string;
  status?: string;
  scale?: string;
};

type UpscaleProps = NodeProps & { data: Record<string, unknown> };

export function UpscaleNode({ id, data: rawData, selected }: UpscaleProps) {
  const data = (rawData ?? {}) as UpscaleNodeData;
  const setNodes = useCanvasStore((s) => s.setNodes);
  const scale = data?.scale ?? "2";

  const updateData = useCallback(
    (updates: Partial<UpscaleNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data ?? {}), ...updates } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <BaseNode
      data={{ ...data, status: "idle" as const }}
      selected={selected}
      nodeType="Upscale"
    >
      <div className={styles.fields}>
        <div className={styles.paramsRow}>
          <span className={styles.refLabel}>Scale</span>
          <select
            className={`${styles.select} nodrag`}
            value={scale}
            onChange={(e) => updateData({ scale: e.target.value })}
          >
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </div>
      </div>
      <Handle type="target" position={Position.Left} id="image" className={styles.handle} />
      <Handle type="source" position={Position.Right} id="image" className={styles.handle} />
    </BaseNode>
  );
}
