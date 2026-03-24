"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function UserIdentityEditor() {
  const { user, displayName, profileName, refreshProfile } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    setDraftName(displayName ?? "");
    setError(null);
  }, [displayName, editing]);

  useEffect(() => {
    if (!editing) return;
    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setEditing(false);
        setError(null);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [editing]);

  if (!user) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: draftName }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError((data as { error?: string }).error ?? "Failed to update name.");
      return;
    }
    await refreshProfile();
    setEditing(false);
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", display: "flex", alignItems: "center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => {
          setDraftName(displayName ?? "");
          setEditing(true);
        }}
        title="Edit your display name"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          maxWidth: 180,
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--dawn-50)",
          cursor: "pointer",
          transition: "color var(--duration-fast)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {profileName}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            opacity: hovered || editing ? 0.8 : 0,
            color: "var(--gold)",
            transition: "opacity var(--duration-fast)",
          }}
        >
          <PencilIcon />
        </span>
      </button>

      {editing && (
        <form
          onSubmit={(event) => void handleSave(event)}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            minWidth: 220,
            padding: 12,
            background: "var(--surface-0)",
            border: "1px solid var(--dawn-08)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--dawn-30)",
            }}
          >
            Name
          </label>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="sigil-input"
            maxLength={60}
            autoFocus
            placeholder="Set your name"
          />
          {error && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--status-error)",
                letterSpacing: "0.06em",
              }}
            >
              {error}
            </span>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="sigil-btn-ghost"
              style={{ fontSize: "10px" }}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={saving}
            >
              cancel
            </button>
            <button
              type="submit"
              className="sigil-btn-secondary"
              style={{ fontSize: "10px" }}
              disabled={saving}
            >
              {saving ? "saving..." : "save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
