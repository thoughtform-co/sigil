"use client";

import { useEffect, useState, useCallback } from "react";

type WorkspaceProject = {
  id: string;
  name: string;
  description?: string | null;
  members: unknown[];
  _count?: { briefings: number };
};

type UserRow = {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  isDisabled: boolean;
  createdAt: string;
  workspaceProjectMembers: Array<{
    workspaceProject: { id: string; name: string };
    role: string;
  }>;
  _count?: { generations: number; projects: number };
};

type BulkInviteResult = { email: string; status: "created" | "exists" | "error"; userId?: string; error?: string };

export function UserManagementAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProject[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [wpError, setWpError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [wpLoading, setWpLoading] = useState(true);

  // Bulk invite state
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteJourneyId, setInviteJourneyId] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<BulkInviteResult[] | null>(null);

  // User table selection and bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [journeyFilterId, setJourneyFilterId] = useState<string>("");
  const [assignJourneyId, setAssignJourneyId] = useState("");
  const [removeJourneyId, setRemoveJourneyId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUsersError(data.error ?? "Failed to load users");
      setUsers([]);
    } else {
      setUsers(data.users ?? []);
    }
    setUsersLoading(false);
  }, []);

  const loadWorkspaceProjects = useCallback(async () => {
    setWpLoading(true);
    setWpError(null);
    const res = await fetch("/api/admin/workspace-projects", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setWpError(data.error ?? "Failed to load journeys");
      setWorkspaceProjects([]);
    } else {
      setWorkspaceProjects(data.workspaceProjects ?? []);
    }
    setWpLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadWorkspaceProjects();
  }, [loadWorkspaceProjects]);

  const filteredUsers = journeyFilterId
    ? users.filter((u) => u.workspaceProjectMembers.some((m) => m.workspaceProject.id === journeyFilterId))
    : users;

  const selectedJourneyName = journeyFilterId
    ? workspaceProjects.find((wp) => wp.id === journeyFilterId)?.name ?? null
    : null;

  const allFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredUsers.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredUsers.forEach((u) => next.add(u.id));
        return next;
      });
    }
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function parseEmails(text: string): string[] {
    return text
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  async function handleBulkInvite(e: React.FormEvent) {
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
        workspaceProjectId: inviteJourneyId || undefined,
        note: inviteNote.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setInviting(false);
    if (res.ok && Array.isArray(data.results)) {
      setInviteResults(data.results);
      setInviteEmails("");
      void loadUsers();
    } else {
      setInviteResults([{ email: "(request)", status: "error", error: data.error ?? "Request failed" }]);
    }
  }

  async function handleBulkAssign() {
    if (!assignJourneyId || selectedIds.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        userIds: Array.from(selectedIds),
        workspaceProjectId: assignJourneyId,
      }),
    });
    setBulkLoading(false);
    if (res.ok) {
      setSelectedIds(new Set());
      void loadUsers();
    }
  }

  async function handleBulkRemove() {
    if (!removeJourneyId || selectedIds.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        userIds: Array.from(selectedIds),
        workspaceProjectId: removeJourneyId,
      }),
    });
    setBulkLoading(false);
    if (res.ok) {
      setSelectedIds(new Set());
      void loadUsers();
    }
  }

  async function handleBulkDisable() {
    if (selectedIds.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "disable",
        userIds: Array.from(selectedIds),
      }),
    });
    setBulkLoading(false);
    if (res.ok) {
      setSelectedIds(new Set());
      void loadUsers();
    }
  }

  const journeysLoading = wpLoading;
  const journeys = workspaceProjects;

  return (
    <div className="admin-section">
      <div className="admin-section-title">Bulk User Management & Journey Assignment</div>
      <div className="admin-section-body">
        {/* ——— Bulk Invite ——— */}
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <h3 style={{ fontSize: "12px", marginBottom: "var(--space-md)", color: "var(--dawn-50)" }}>
            Bulk Invite
          </h3>
          <form onSubmit={handleBulkInvite} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: 520 }}>
            <div>
              <label htmlFor="invite-emails" className="admin-label">Emails (one per line or comma-separated)</label>
              <textarea
                id="invite-emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="user@example.com
other@example.com"
                rows={4}
                className="admin-input"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            <div>
              <label htmlFor="invite-journey" className="admin-label">Assign to journey (optional)</label>
              <select
                id="invite-journey"
                value={inviteJourneyId}
                onChange={(e) => setInviteJourneyId(e.target.value)}
                className="admin-input"
                style={{ width: "100%" }}
                disabled={journeysLoading}
              >
                <option value="">— None —</option>
                {journeys.map((wp) => (
                  <option key={wp.id} value={wp.id}>{wp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="invite-note" className="admin-label">Note (optional)</label>
              <input
                id="invite-note"
                type="text"
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
                placeholder="e.g. Workshop batch"
                className="admin-input"
                style={{ width: "100%" }}
              />
            </div>
            <button
              type="submit"
              disabled={inviting || parseEmails(inviteEmails).length === 0}
              className="admin-btn admin-btn--gold"
            >
              {inviting ? "Inviting…" : "Invite"}
            </button>
          </form>
          {inviteResults && (
            <div style={{ marginTop: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              {inviteResults.map((r, i) => (
                <div key={i} style={{ color: r.status === "error" ? "var(--status-error)" : "var(--dawn-60)" }}>
                  {r.email}: {r.status}{r.error ? ` — ${r.error}` : ""}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ——— Journey selector & User table ——— */}
        <section>
          <h3 style={{ fontSize: "12px", marginBottom: "var(--space-md)", color: "var(--dawn-50)" }}>
            Users
          </h3>
          {wpError && (
            <p style={{ marginBottom: "var(--space-md)", color: "var(--status-error)", fontSize: "12px" }}>{wpError}</p>
          )}
          <div style={{ marginBottom: "var(--space-md)" }}>
            <label htmlFor="journey-filter" className="admin-label">Journey</label>
            <select
              id="journey-filter"
              value={journeyFilterId}
              onChange={(e) => { setJourneyFilterId(e.target.value); setSelectedIds(new Set()); }}
              className="admin-input"
              style={{ width: "100%" }}
              disabled={journeysLoading}
            >
              <option value="">All users ({users.length})</option>
              {journeys.map((wp) => {
                const count = users.filter((u) => u.workspaceProjectMembers.some((m) => m.workspaceProject.id === wp.id)).length;
                return (
                  <option key={wp.id} value={wp.id}>{wp.name} ({count})</option>
                );
              })}
            </select>
          </div>

          {someSelected && (
            <div
              className="admin-section"
              style={{
                marginBottom: "var(--space-md)",
                padding: "var(--space-md)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "var(--space-md)",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--dawn-50)" }}>
                {selectedIds.size} selected
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
                <select
                  value={assignJourneyId}
                  onChange={(e) => setAssignJourneyId(e.target.value)}
                  className="admin-input"
                  style={{ minWidth: 160 }}
                  disabled={journeysLoading}
                >
                  <option value="">Choose journey…</option>
                  {journeys.map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={!assignJourneyId || bulkLoading}
                  className="admin-btn admin-btn--gold"
                >
                  {bulkLoading ? "…" : "Assign"}
                </button>
                <select
                  value={removeJourneyId}
                  onChange={(e) => setRemoveJourneyId(e.target.value)}
                  className="admin-input"
                  style={{ minWidth: 160 }}
                  disabled={journeysLoading}
                >
                  <option value="">Choose journey…</option>
                  {journeys.map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkRemove}
                  disabled={!removeJourneyId || bulkLoading}
                  className="admin-btn"
                >
                  {bulkLoading ? "…" : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDisable}
                  disabled={bulkLoading}
                  className="admin-btn admin-btn--danger"
                >
                  {bulkLoading ? "…" : "Disable"}
                </button>
              </div>
            </div>
          )}

          {usersError && (
            <p style={{ color: "var(--status-error)", fontSize: "12px", marginBottom: "var(--space-md)" }}>{usersError}</p>
          )}
          {usersLoading ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>
              {journeyFilterId ? "No users in this journey." : "No users yet."}
            </p>
          ) : (
            <>
              {selectedJourneyName && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "var(--space-sm)",
                    paddingBottom: "var(--space-xs)",
                    borderBottom: "1px solid var(--dawn-08)",
                  }}
                >
                  {selectedJourneyName}
                  <span style={{ color: "var(--dawn-20)", marginLeft: "var(--space-sm)" }}>
                    {filteredUsers.length}
                  </span>
                </div>
              )}
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          disabled={u.isDisabled}
                          aria-label={`Select ${u.displayName ?? u.username ?? u.id}`}
                        />
                      </td>
                      <td>{u.displayName ?? u.username ?? u.id}</td>
                      <td style={{ color: "var(--dawn-40)", fontSize: "11px" }}>{u.email ?? "—"}</td>
                      <td style={{ color: "var(--dawn-40)" }}>{u.role}</td>
                      <td style={{ color: "var(--dawn-40)", fontSize: "11px" }}>
                        {u.isDisabled ? "Disabled" : "Active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
