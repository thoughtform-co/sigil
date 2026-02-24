"use client";

import Link from "next/link";
import { type SessionItem } from "@/components/generation/types";
import styles from "./ForgeSidebar.module.css";

type ForgeSidebarProps = {
  projectId: string;
  projectName: string;
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: (type: "image" | "video") => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionRename?: (sessionId: string, name: string) => void;
  /** Current generation type; "+" creates a session of this type */
  generationType: "image" | "video";
  /** Optional thumbnail URL per session id (e.g. first output of latest generation) */
  sessionThumbnails?: Record<string, string>;
  busy: boolean;
};

export function ForgeSidebar({
  projectId,
  projectName,
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  generationType,
  sessionThumbnails,
  busy,
}: ForgeSidebarProps) {
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
        onClick={() => onSessionCreate(generationType)}
        disabled={busy}
        aria-label="New session"
      >
        <span className={styles.newIcon}>+</span>
      </button>
      <div className={styles.sessionList}>
        {sessions.length === 0 ? (
          <p className={styles.empty}>
            <span className={styles.emptyText}>No sessions</span>
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            const thumbUrl = sessionThumbnails?.[session.id];
            return (
              <div key={session.id} className={styles.sessionItemWrapper}>
                <button
                  type="button"
                  onClick={() => onSessionSelect(session.id)}
                  className={`${styles.sessionItem} ${isActive ? styles.sessionActive : ""}`}
                >
                  <div className={styles.thumbnail}>
                    {thumbUrl ? (
                      thumbUrl.match(/\.(webm|mp4|mov)$/i) ? (
                        <video
                          src={thumbUrl}
                          className={styles.thumbnailVideo}
                          muted
                          preload="metadata"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumbUrl}
                          alt=""
                          className={styles.thumbnailImage}
                        />
                      )
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
                      onSessionDelete(session.id);
                    }}
                    disabled={busy}
                    aria-label={`Delete ${session.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionName}>{session.name}</span>
                  <span className={styles.sessionType}>{session.type}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
