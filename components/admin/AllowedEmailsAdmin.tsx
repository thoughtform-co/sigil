"use client";

import { useEffect, useState } from "react";

type AllowedEmailRow = {
  id: string;
  email: string;
  note: string | null;
  createdAt: string;
};

export function AllowedEmailsAdmin() {
  const [list, setList] = useState<AllowedEmailRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addNote, setAddNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/allowed-emails", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setList([]);
    } else {
      setList(data.allowedEmails ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = addEmail.trim().toLowerCase();
    if (!email || adding) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/admin/allowed-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, note: addNote.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAddError(data.error ?? "Failed to add");
    } else {
      setAddEmail("");
      setAddNote("");
      setList((prev) => [data, ...prev]);
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/allowed-emails/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((row) => row.id !== id));
    }
  }

  if (error) {
    return (
      <div className="admin-section" style={{ borderColor: "var(--status-error)" }}>
        <div className="admin-section-body" style={{ color: "var(--status-error)" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="admin-section-title">Allowed Emails (Magic Link Access)</div>
      <div className="admin-section-body">
        {/* Add form */}
        <form onSubmit={handleAdd} style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <label htmlFor="new-email" className="admin-label">Email</label>
            <input
              id="new-email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              className="admin-input"
            />
          </div>
          <div style={{ flex: "0 1 180px", minWidth: 0 }}>
            <label htmlFor="new-note" className="admin-label">Note (optional)</label>
            <input
              id="new-note"
              type="text"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="Workshop attendee"
              className="admin-input"
            />
          </div>
          <button type="submit" disabled={adding || !addEmail.trim()} className="admin-btn admin-btn--gold">
            {adding ? "Adding…" : "Add"}
          </button>
        </form>

        {addError && (
          <p style={{ marginBottom: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--status-error)" }}>
            {addError}
          </p>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>Loading…</p>
        ) : list.length === 0 ? (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-30)" }}>
            No allowed emails yet. Add one to enable magic link sign-in.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Note</th>
                <th>Added</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td style={{ color: "var(--dawn-40)" }}>{row.note ?? "—"}</td>
                  <td style={{ color: "var(--dawn-40)", fontSize: "11px" }}>
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" onClick={() => handleDelete(row.id)} className="admin-btn admin-btn--danger">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
