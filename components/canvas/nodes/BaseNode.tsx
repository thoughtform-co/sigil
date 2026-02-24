"use client";

import type { NodeProps } from "@xyflow/react";
import styles from "./BaseNode.module.css";

type BaseNodeData = {
  label?: string;
  status?: "idle" | "processing" | "completed" | "failed";
};

type BaseNodeProps = {
  data?: Partial<BaseNodeData>;
  selected?: boolean;
  nodeType: string;
  children: React.ReactNode;
};

export function BaseNode({ data, selected, nodeType, children }: BaseNodeProps) {
  const status = (data?.status as BaseNodeData["status"]) ?? "idle";
  const label = (data?.label as string) ?? nodeType;

  return (
    <div className={`${styles.wrapper} ${selected ? styles.selected : ""}`}>
      <div className={styles.header}>
        <span className={`${styles.statusDot} ${styles[status]}`} />
        {label}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
