"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getProfileName } from "@/lib/profile-name";
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
  magicLinkSent?: boolean;
  destination?: string;
};

function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

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
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [memberActionNotice, setMemberActionNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

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
  const userDirectory = useMemo(
    () => new Map(allUsers.map((u) => [u.id, u])),
    [allUsers],
  );

  function parseEmails(text: string): string[] {
    return text
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  function formatInviteResult(result: BulkInviteResult): string {
    if (result.status === "error") {
      return `${result.email}: ${result.error ?? "Invite failed"}`;
    }

    const provisionedLabel =
      result.status === "created" ? "account created" : "existing account";
    const destinationLabel = result.destination
      ? ` -> ${result.destination}`
      : "";

    return `${result.email}: ${provisionedLabel}, magic link sent${destinationLabel}`;
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

  async function handleResendMagicLink(userId: string) {
    if (resendingUserId) return;
    setResendingUserId(userId);
    setMemberActionNotice(null);

    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resend_magic_link",
        userIds: [userId],
        workspaceProjectId: journeyId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setResendingUserId(null);

    const result = Array.isArray((data as { results?: BulkInviteResult[] }).results)
      ? (data as { results: BulkInviteResult[] }).results[0]
      : undefined;

    if (!res.ok || !result) {
      setMemberActionNotice({
        kind: "error",
        message: (data as { error?: string }).error ?? "Failed to resend magic link.",
      });
      return;
    }

    setMemberActionNotice({
      kind: result.status === "error" ? "error" : "success",
      message: formatInviteResult(result),
    });
  }

  function startEditingMemberName(member: MemberRow) {
    setEditingMemberId(member.userId);
    setEditingDisplayName(member.user.displayName ?? "");
    setMemberActionNotice(null);
  }

  async function handleSaveMemberName(userId: string) {
    if (savingMemberId) return;
    setSavingMemberId(userId);
    setMemberActionNotice(null);

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: editingDisplayName }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingMemberId(null);

    if (!res.ok) {
      setMemberActionNotice({
        kind: "error",
        message: (data as { error?: string }).error ?? "Failed to save member name.",
      });
      return;
    }

    setEditingMemberId(null);
    setEditingDisplayName("");
    setMemberActionNotice({
      kind: "success",
      message: "Member name updated.",
    });
    void loadMembers();
    void loadUserDirectory();
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
        Invite by email, add existing users, or remove members. Invited users receive a magic-link email and can land directly in this journey. Optional workshop lock confines users to this journey only.
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
            {inviting ? "Sending…" : "Invite, email & assign"}
          </button>
        </form>

        {inviteResults && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--dawn-50)" }}>
            {inviteResults.map((r, i) => (
              <div key={i} style={{ color: r.status === "error" ? "var(--status-error)" : undefined }}>
                {formatInviteResult(r)}
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
        {memberActionNotice && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: memberActionNotice.kind === "error" ? "var(--status-error)" : "var(--dawn-50)",
              marginBottom: "var(--space-sm)",
            }}
          >
            {memberActionNotice.message}
          </p>
        )}
        {loading ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-30)" }}>Loading…</p>
        ) : members.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-30)" }}>No members yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => (
              <li
                key={m.userId}
                onMouseEnter={() => setHoveredMemberId(m.userId)}
                onMouseLeave={() =>
                  setHoveredMemberId((prev) => (prev === m.userId ? null : prev))
                }
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
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                  {editingMemberId === m.userId ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input
                        className="sigil-input"
                        value={editingDisplayName}
                        onChange={(e) => setEditingDisplayName(e.target.value)}
                        maxLength={60}
                        placeholder="Set member name"
                        style={{ minWidth: 180, maxWidth: 260 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="sigil-btn-ghost"
                        style={{ fontSize: "10px" }}
                        disabled={savingMemberId === m.userId}
                        onClick={() => void handleSaveMemberName(m.userId)}
                      >
                        {savingMemberId === m.userId ? "saving..." : "save"}
                      </button>
                      <button
                        type="button"
                        className="sigil-btn-ghost"
                        style={{ fontSize: "10px" }}
                        disabled={savingMemberId === m.userId}
                        onClick={() => {
                          setEditingMemberId(null);
                          setEditingDisplayName("");
                          setMemberActionNotice(null);
                        }}
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span
                        style={{
                          color: m.user.isDisabled ? "var(--dawn-30)" : "var(--dawn)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getProfileName({
                          displayName: m.user.displayName,
                          username: m.user.username,
                          email: userDirectory.get(m.userId)?.email ?? null,
                          id: m.userId,
                        })}
                        {m.user.isDisabled ? " (disabled)" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditingMemberName(m)}
                        title="Edit member name"
                        aria-label="Edit member name"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "var(--gold)",
                          cursor: "pointer",
                          opacity: hoveredMemberId === m.userId ? 0.8 : 0,
                          transition: "opacity var(--duration-fast)",
                        }}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  )}
                  {userDirectory.get(m.userId)?.email && (
                    <span
                      style={{
                        color: "var(--dawn-40)",
                        fontSize: "10px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userDirectory.get(m.userId)?.email}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="sigil-btn-ghost"
                    style={{ fontSize: "10px" }}
                    disabled={!userDirectory.get(m.userId)?.email || m.user.isDisabled || resendingUserId === m.userId}
                    onClick={() => void handleResendMagicLink(m.userId)}
                  >
                    {resendingUserId === m.userId ? "sending..." : "resend link"}
                  </button>
                  <button
                    type="button"
                    className="sigil-btn-ghost"
                    style={{ fontSize: "10px" }}
                    onClick={() => void handleRemove(m.userId)}
                  >
                    remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
