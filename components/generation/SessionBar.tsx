"use client";

export type SessionItem = {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
};

type SessionBarProps = {
  sessions: SessionItem[];
  activeSessionId: string | null;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: (type: "image" | "video") => void;
  onSessionDelete: (sessionId: string) => void;
  onProjectRename: () => void;
  busy: boolean;
};

const labelStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--dawn-50)",
};

export function SessionBar({
  sessions,
  activeSessionId,
  projectName,
  onProjectNameChange,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onProjectRename,
  busy,
}: SessionBarProps) {
  return (
    <aside className="sigil-session-bar border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4 flex flex-col min-h-0">
      <div className="mb-3 flex gap-2 shrink-0">
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="sigil-input flex-1 min-w-0 text-xs py-1"
          placeholder="Project name"
        />
        <button
          type="button"
          onClick={() => void onProjectRename()}
          disabled={busy || !projectName.trim()}
          className="sigil-btn-secondary shrink-0 text-[10px] py-1 px-2 disabled:opacity-50"
        >
          rename
        </button>
      </div>
      <h2 style={labelStyle} className="shrink-0">
        sessions
      </h2>
      <div className="mt-3 flex gap-2 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSessionCreate("image")}
          className="sigil-btn-secondary text-[10px] py-1 px-2 disabled:opacity-50"
        >
          + image
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSessionCreate("video")}
          className="sigil-btn-secondary text-[10px] py-1 px-2 disabled:opacity-50"
        >
          + video
        </button>
      </div>
      <div className="mt-3 space-y-2 overflow-y-auto min-h-0 flex-1">
        {sessions.map((session) => {
          const isActive = activeSessionId === session.id;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSessionSelect(session.id)}
              className={`sigil-session-card w-full border px-2 py-2 text-left text-xs transition-colors ${
                isActive
                  ? "border-[var(--gold)] text-[var(--gold)]"
                  : "border-[var(--dawn-08)] text-[var(--dawn-50)] hover:border-[var(--dawn-15)]"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <div className="uppercase tracking-[0.08em]">{session.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] opacity-70">
                {session.type}
              </div>
              <div className="mt-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onSessionDelete(session.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      void onSessionDelete(session.id);
                    }
                  }}
                  className="inline-block text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-30)] hover:text-[var(--gold)]"
                >
                  delete session
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
