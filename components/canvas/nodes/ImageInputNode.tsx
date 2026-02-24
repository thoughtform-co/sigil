"use client";

import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useCanvasStore } from "../stores/canvasStore";
import styles from "./ImageGenNode.module.css";

export type ImageInputNodeData = {
  label?: string;
  status?: string;
  imageUrl?: string;
};

type ImageInputProps = NodeProps & { data: Record<string, unknown> };

export function ImageInputNode({ id, data: rawData, selected }: ImageInputProps) {
  const data = (rawData ?? {}) as ImageInputNodeData;
  const setNodes = useCanvasStore((s) => s.setNodes);
  const imageUrl = data?.imageUrl ?? "";

  const updateData = useCallback(
    (updates: Partial<ImageInputNodeData>) => {
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
      data={{
        ...data,
        status: "idle" as const,
      }}
      selected={selected}
      nodeType="Image Input"
    >
      <div className={styles.fields}>
        <div className={styles.refRow}>
          <span className={styles.refLabel}>Image URL</span>
          <input
            type="url"
            className={`${styles.refInput} nodrag`}
            value={imageUrl}
            onChange={(e) => updateData({ imageUrl: e.target.value })}
            placeholder="Paste image URL or upload later"
          />
        </div>
      </div>
      {imageUrl && (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Input" className={styles.previewImg} onError={() => updateData({ imageUrl: "" })} />
        </div>
      )}
      <Handle type="source" position={Position.Right} id="image" className={styles.handle} />
    </BaseNode>
  );
}
