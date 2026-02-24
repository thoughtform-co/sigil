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
    const res = await fetch(`/api/admin/allowed-emails/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setList((prev) => prev.filter((row) => row.id !== id));
    }
  }

  if (error) {
    return (
      <div
        className="border border-[var(--status-error)]/40 bg-[var(--surface-0)] p-4"
        style={{ color: "var(--status-error)" }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
      <h2
        className="sigil-section-label"
        style={{
          fontSize: "10px",
          letterSpacing: "0.08em",
          marginBottom: "var(--space-sm)",
          fontFamily: "var(--font-mono)",
          color: "var(--dawn-50)",
        }}
      >
        allowed emails (magic link access)
      </h2>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="new-email"
            className="block text-[9px] uppercase tracking-wider"
            style={{ color: "var(--dawn-40)", fontFamily: "var(--font-mono)" }}
          >
            Email
          </label>
          <input
            id="new-email"
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="user@example.com"
            className="mt-1 w-56 px-2 py-1.5 text-sm outline-none"
            style={{
              background: "var(--dawn-04)",
              border: "1px solid var(--dawn-08)",
              color: "var(--dawn)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="new-note"
            className="block text-[9px] uppercase tracking-wider"
            style={{ color: "var(--dawn-40)", fontFamily: "var(--font-mono)" }}
          >
            Note (optional)
          </label>
          <input
            id="new-note"
            type="text"
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
            placeholder="Workshop attendee"
            className="mt-1 w-40 px-2 py-1.5 text-sm outline-none"
            style={{
              background: "var(--dawn-04)",
              border: "1px solid var(--dawn-08)",
              color: "var(--dawn)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={adding || !addEmail.trim()}
          className="px-3 py-1.5 text-[10px] uppercase tracking-wider disabled:opacity-50"
          style={{
            background: "var(--gold-20)",
            border: "1px solid var(--gold-30)",
            color: "var(--gold)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
      {addError && (
        <p className="mb-2 text-xs" style={{ color: "var(--status-error)" }}>
          {addError}
        </p>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--dawn-50)" }}>
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dawn-50)" }}>
          No allowed emails yet. Add one to enable magic link sign-in.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            <thead>
              <tr style={{ color: "var(--dawn-40)", borderBottom: "1px solid var(--dawn-08)" }}>
                <th className="py-2 pr-4 font-normal uppercase tracking-wider">Email</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wider">Note</th>
                <th className="py-2 pr-4 font-normal uppercase tracking-wider">Added</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody style={{ color: "var(--dawn-70)" }}>
              {list.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--dawn-08)" }}>
                  <td className="py-2 pr-4">{row.email}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--dawn-50)" }}>
                    {row.note ?? "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--dawn-50)", fontSize: "11px" }}>
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-[10px] uppercase tracking-wider underline"
                      style={{ color: "var(--status-error)" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
