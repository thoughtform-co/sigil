"use client";

import Link from "next/link";
import type { WorkflowItem } from "./types";
import styles from "./CanvasSidebar.module.css";

type CanvasSidebarProps = {
  projectId: string;
  projectName: string;
  workflows: WorkflowItem[];
  activeWorkflowId: string | null;
  onWorkflowSelect: (workflowId: string) => void;
  onWorkflowCreate: () => void;
  onWorkflowDelete: (workflowId: string) => void;
  workflowThumbnails?: Record<string, string>;
  busy: boolean;
};

export function CanvasSidebar({
  projectId,
  projectName,
  workflows,
  activeWorkflowId,
  onWorkflowSelect,
  onWorkflowCreate,
  onWorkflowDelete,
  workflowThumbnails,
  busy,
}: CanvasSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.projectRow}>
        <Link href="/projects" className={styles.projectLink} aria-label="Back to projects">
          {projectName || "Project"}
        </Link>
      </div>
      <button
        type="button"
        className={styles.newButton}
        onClick={onWorkflowCreate}
        disabled={busy}
        aria-label="New workflow"
      >
        <span className={styles.newIcon}>+</span>
      </button>
      <div className={styles.workflowList}>
        {workflows.length === 0 ? (
          <p className={styles.empty}>
            <span className={styles.emptyText}>No workflows</span>
          </p>
        ) : (
          workflows.map((workflow) => {
            const isActive = activeWorkflowId === workflow.id;
            const thumbUrl = workflowThumbnails?.[workflow.id];
            return (
              <div key={workflow.id} className={styles.workflowItemWrapper}>
                <button
                  type="button"
                  onClick={() => onWorkflowSelect(workflow.id)}
                  className={`${styles.workflowItem} ${isActive ? styles.workflowActive : ""}`}
                >
                  <div className={styles.thumbnail}>
                    {thumbUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={thumbUrl}
                        alt=""
                        className={styles.thumbnailImage}
                      />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <span className={styles.thumbnailPlaceholderIcon}>◇</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className={styles.actionOverlay}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWorkflowDelete(workflow.id);
                    }}
                    disabled={busy}
                    aria-label={`Delete ${workflow.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className={styles.workflowInfo}>
                  <span className={styles.workflowName}>{workflow.name}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
