"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const label = mode === "login" ? "Sign In" : "Create Account";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div
      className="relative w-full animate-fade-in-up"
      style={{
        maxWidth: "360px",
        padding: "32px 28px 28px",
        background: "var(--surface-0)",
        border: "1px solid var(--dawn-15)",
      }}
    >
      {/* Corner accent marks */}
      <div
        style={{
          position: "absolute",
          top: "-1px",
          left: "-1px",
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-1px",
          right: "-1px",
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-1px",
          left: "-1px",
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-1px",
          right: "-1px",
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--gold)",
          }}
        >
          Sigil Platform
        </span>
        <h1
          style={{
            marginTop: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: "var(--dawn)",
          }}
        >
          {mode === "login" ? "Authentication" : "Registration"}
        </h1>
        <p
          style={{
            marginTop: "8px",
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            lineHeight: "1.6",
            color: "var(--dawn-40)",
          }}
        >
          {mode === "login"
            ? "Enter your credentials to access generation workspace."
            : "Create an account to start generating."}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            htmlFor="email"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn-40)",
            }}
          >
            email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="outline-none transition-colors"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--dawn)",
              background: "var(--dawn-04)",
              border: "1px solid var(--dawn-08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-30)";
              e.currentTarget.style.background = "rgba(20, 19, 16, 0.8)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--dawn-08)";
              e.currentTarget.style.background = "var(--dawn-04)";
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            htmlFor="password"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn-40)",
            }}
          >
            password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="outline-none transition-colors"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--dawn)",
              background: "var(--dawn-04)",
              border: "1px solid var(--dawn-08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-30)";
              e.currentTarget.style.background = "rgba(20, 19, 16, 0.8)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--dawn-08)";
              e.currentTarget.style.background = "var(--dawn-04)";
            }}
          />
        </div>

        {error ? (
          <div
            style={{
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--status-error)",
              background: "rgba(193, 127, 89, 0.1)",
              border: "1px solid rgba(193, 127, 89, 0.2)",
            }}
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full transition-all"
          style={{
            marginTop: "4px",
            padding: "12px 0",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: loading ? "var(--dawn-30)" : "var(--dawn)",
            background: loading ? "var(--gold-10)" : "var(--gold-20)",
            border: "1px solid var(--gold-30)",
            cursor: loading ? "not-allowed" : "pointer",
            transitionDuration: "var(--duration-fast)",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = "var(--gold-30)";
              e.currentTarget.style.borderColor = "var(--gold)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = loading ? "var(--gold-10)" : "var(--gold-20)";
            e.currentTarget.style.borderColor = "var(--gold-30)";
          }}
        >
          {loading ? "Authenticating..." : label}
        </button>
      </form>
    </div>
  );
}
