"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import styles from "./ImageGenNode.module.css";

type StyleTransferProps = NodeProps & { data: Record<string, unknown> };

export function StyleTransferNode({ data: rawData, selected }: StyleTransferProps) {
  const data = (rawData ?? {}) as { label?: string; status?: string };

  return (
    <BaseNode
      data={{ ...data, status: "idle" as const }}
      selected={selected}
      nodeType="Style Transfer"
    >
      <div className={styles.fields}>
        <p className={styles.error}>Style transfer (coming soon)</p>
      </div>
      <Handle type="target" position={Position.Left} id="content" className={styles.handle} />
      <Handle type="target" position={Position.Left} id="style" className={styles.handle} />
      <Handle type="source" position={Position.Right} id="image" className={styles.handle} />
    </BaseNode>
  );
}
