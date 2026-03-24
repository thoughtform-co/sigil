"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";

type MemberRow = {
  userId: string;
  role: string;
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    isDisabled: boolean;
  };
};

type ApiMember = {
  userId: string;
  role: string;
  user: MemberRow["user"];
};

type AdminUserOption = {
  id: string;
  displayName: string | null;
  username: string | null;
  email: string | null;
  role: string;
  workspaceProjectMembers?: Array<{ workspaceProject: { id: string } }>;
};

type BulkInviteResult = {
  email: string;
  status: "created" | "exists" | "error";
  userId?: string;
  error?: string;
};

export function JourneyParticipantsPanel({
  journeyId,
  journeyName,
}: {
  journeyId: string;
  journeyName: string;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLock, setInviteLock] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<BulkInviteResult[] | null>(null);

  const [allUsers, setAllUsers] = useState<AdminUserOption[]>([]);
  const [userPickId, setUserPickId] = useState("");
  const [assignLock, setAssignLock] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadMembers = useCallback(async () => {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/admin/workspace-projects/${journeyId}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Failed to load members");
      setMembers([]);
      setLoading(false);
      return;
    }
    const wp = (data as { workspaceProject?: { members?: ApiMember[] } }).workspaceProject;
    const raw = wp?.members ?? [];
    setMembers(
      raw.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
    );
    setLoading(false);
  }, [journeyId]);

  const loadUserDirectory = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray((data as { users?: AdminUserOption[] }).users)) {
      setAllUsers((data as { users: AdminUserOption[] }).users);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
    void loadUserDirectory();
  }, [loadMembers, loadUserDirectory]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);

  const addableUsers = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id) && u.role !== "admin"),
    [allUsers, memberIds],
  );

  function parseEmails(text: string): string[] {
    return text
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseEmails(inviteEmails);
    if (emails.length === 0 || inviting) return;
    setInviting(true);
    setInviteResults(null);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        emails,
        workspaceProjectId: journeyId,
        lockToJourney: inviteLock,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setInviting(false);
    if (res.ok && Array.isArray((data as { results?: BulkInviteResult[] }).results)) {
      setInviteResults((data as { results: BulkInviteResult[] }).results);
      setInviteEmails("");
      void loadMembers();
      void loadUserDirectory();
    } else {
      setInviteResults([
        { email: "(request)", status: "error", error: (data as { error?: string }).error ?? "Request failed" },
      ]);
    }
  }

  async function handleAddExisting() {
    if (!userPickId || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/workspace-projects/${journeyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userPickId, role: "member" }),
      });
      if (!res.ok) return;
      if (assignLock) {
        await fetch("/api/admin/users/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            userIds: [userPickId],
            workspaceProjectId: journeyId,
            lockToJourney: true,
          }),
        });
      }
      setUserPickId("");
      void loadMembers();
      void loadUserDirectory();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/admin/workspace-projects/${journeyId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      void loadMembers();
      void loadUserDirectory();
    }
  }

  return (
    <div style={{ marginTop: "var(--space-xl)", paddingTop: "var(--space-lg)", borderTop: "1px solid var(--dawn-08)" }}>
      <SectionHeader label={`PARTICIPANTS — ${journeyName.toUpperCase()}`} />
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--dawn-40)",
          marginTop: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          letterSpacing: "0.06em",
        }}
      >
        Invite by email, add existing users, or remove members. Optional workshop lock confines users to this journey only.
      </p>

      {error && (
        <p style={{ color: "var(--status-error)", fontSize: "12px", marginBottom: "var(--space-md)" }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "grid", gap: "var(--space-lg)", maxWidth: 640 }}>
        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <label className="sigil-section-label" style={{ fontSize: "9px" }}>
            Invite by email
          </label>
          <textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            rows={3}
            className="sigil-textarea"
            placeholder="one@example.com, other@example.com"
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11px", color: "var(--dawn-50)" }}>
            <input type="checkbox" checked={inviteLock} onChange={(e) => setInviteLock(e.target.checked)} />
            Lock to this journey (workshop mode)
          </label>
          <button type="submit" className="sigil-btn-secondary" disabled={inviting || parseEmails(inviteEmails).length === 0}>
            {inviting ? "Sending…" : "Invite & assign"}
          </button>
        </form>

        {inviteResults && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--dawn-50)" }}>
            {inviteResults.map((r, i) => (
              <div key={i} style={{ color: r.status === "error" ? "var(--status-error)" : undefined }}>
                {r.email}: {r.status}
                {r.error ? ` — ${r.error}` : ""}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <label className="sigil-section-label" style={{ fontSize: "9px" }}>
            Add existing user
          </label>
          <select
            value={userPickId}
            onChange={(e) => setUserPickId(e.target.value)}
            className="sigil-input"
            style={{ maxWidth: 400 }}
          >
            <option value="">Choose user…</option>
            {addableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.displayName ?? u.username ?? u.id).slice(0, 48)} {u.email ? `(${u.email})` : ""}
              </option>
            ))}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11px", color: "var(--dawn-50)" }}>
            <input type="checkbox" checked={assignLock} onChange={(e) => setAssignLock(e.target.checked)} />
            Lock to this journey after adding
          </label>
          <button type="button" className="sigil-btn-secondary" disabled={!userPickId || adding} onClick={() => void handleAddExisting()}>
            {adding ? "Adding…" : "Add to journey"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-xl)" }}>
        <div className="sigil-section-label" style={{ fontSize: "9px", marginBottom: "var(--space-sm)" }}>
          Members ({members.length})
        </div>
        {loading ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-30)" }}>Loading…</p>
        ) : members.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-30)" }}>No members yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => (
              <li
                key={m.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-md)",
                  padding: "8px 10px",
                  border: "1px solid var(--dawn-08)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                }}
              >
                <span style={{ color: m.user.isDisabled ? "var(--dawn-30)" : "var(--dawn)" }}>
                  {m.user.displayName ?? m.user.username ?? m.userId}
                  {m.user.isDisabled ? " (disabled)" : ""}
                </span>
                <button
                  type="button"
                  className="sigil-btn-ghost"
                  style={{ fontSize: "10px" }}
                  onClick={() => void handleRemove(m.userId)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
