"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RunicRain } from "@/components/ui/RunicRain";

type ViewState = "form" | "sent" | "error";

const IS_DEV = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<ViewState>("form");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setErrorMsg("Authentication failed. Please try again.");
      setView("error");
    }
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleMagicLink = async () => {
    const checkRes = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const checkData = (await checkRes.json()) as { allowed?: boolean };
    if (!checkData.allowed) {
      setErrorMsg("This email is not on the access list. Contact an admin for access.");
      setView("error");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setView("error");
    } else {
      setView("sent");
    }
  };

  const handlePassword = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setView("error");
    } else {
      router.replace("/dashboard");
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMsg("");

    try {
      if (IS_DEV && password) {
        await handlePassword();
      } else {
        await handleMagicLink();
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setView("error");
    } finally {
      setLoading(false);
    }
  };

  const cornerStyle = (
    pos: "tl" | "tr" | "bl" | "br"
  ): React.CSSProperties => ({
    position: "absolute",
    width: "16px",
    height: "16px",
    ...(pos.includes("t") ? { top: "-1px" } : { bottom: "-1px" }),
    ...(pos.includes("l") ? { left: "-1px" } : { right: "-1px" }),
    borderColor: "var(--gold)",
    borderStyle: "solid",
    borderWidth: 0,
    ...(pos.includes("t") && { borderTopWidth: "1px" }),
    ...(pos.includes("b") && { borderBottomWidth: "1px" }),
    ...(pos.includes("l") && { borderLeftWidth: "1px" }),
    ...(pos.includes("r") && { borderRightWidth: "1px" }),
    opacity: 0.5,
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <RunicRain />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(5, 4, 3, 0.8) 100%)",
        }}
      />

      <div
        className={`relative z-10 flex items-center justify-center min-h-screen transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
        style={{ padding: "clamp(16px, 4vw, 32px)" }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div
            className="relative"
            style={{
              background: "rgba(10, 9, 8, 0.8)",
              border: "1px solid var(--dawn-08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              padding: "clamp(32px, 5vw, 48px)",
            }}
          >
            <div style={cornerStyle("tl")} />
            <div style={cornerStyle("tr")} />
            <div style={cornerStyle("bl")} />
            <div style={cornerStyle("br")} />

            <div className="text-center" style={{ marginBottom: "40px" }}>
              <span
                className="block select-none"
                style={{
                  color: "var(--gold)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "32px",
                  lineHeight: 1,
                  marginBottom: "16px",
                }}
                aria-hidden="true"
              >
                ᛭
              </span>
              <h1
                style={{
                  color: "var(--dawn)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                }}
              >
                SIGIL
              </h1>
              <p
                style={{
                  color: "var(--dawn-40)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  marginTop: "8px",
                }}
              >
                Generation Platform
              </p>
            </div>

            {(view === "form" || view === "error") && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "24px" }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      color: "var(--dawn-40)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (view === "error") setView("form");
                    }}
                    className="w-full outline-none transition-colors"
                    style={{
                      color: "var(--dawn)",
                      background: "var(--dawn-04)",
                      border: "1px solid var(--dawn-08)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      padding: "12px 16px",
                      borderRadius: 0,
                    }}
                  />
                </div>

                {IS_DEV && (
                  <div style={{ marginBottom: "24px" }}>
                    <label
                      htmlFor="password"
                      style={{
                        display: "block",
                        color: "var(--dawn-40)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Password
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "var(--dawn-30)",
                          fontSize: "9px",
                          textTransform: "none",
                          letterSpacing: "normal",
                        }}
                      >
                        dev only — leave empty for magic link
                      </span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="optional in dev"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (view === "error") setView("form");
                      }}
                      className="w-full outline-none transition-colors"
                      style={{
                        color: "var(--dawn)",
                        background: "var(--dawn-04)",
                        border: "1px solid var(--dawn-08)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "14px",
                        padding: "12px 16px",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                )}

                {view === "error" && errorMsg && (
                  <p
                    style={{
                      color: "var(--status-error)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      marginBottom: "16px",
                    }}
                    role="alert"
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full transition-all disabled:opacity-40 disabled:cursor-not-allowed outline-none"
                  style={{
                    color: "var(--void)",
                    background: "var(--gold)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    padding: "14px 16px",
                    borderRadius: 0,
                    border: "none",
                    cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {IS_DEV && password ? "Signing in..." : "Sending..."}
                    </span>
                  ) : (
                    IS_DEV && password ? "Sign In" : "Send Magic Link"
                  )}
                </button>
              </form>
            )}

            {view === "sent" && (
              <div className="text-center" style={{ padding: "8px 0" }}>
                <div
                  className="mx-auto flex items-center justify-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "var(--gold-10)",
                    border: "1px solid var(--gold-15)",
                    marginBottom: "24px",
                  }}
                >
                  <svg
                    style={{ width: "24px", height: "24px", color: "var(--gold)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    color: "var(--dawn)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Check your email
                </p>
                <p
                  style={{
                    color: "var(--dawn-40)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    marginTop: "8px",
                  }}
                >
                  We sent a magic link to{" "}
                  <span style={{ color: "var(--dawn-70)", fontWeight: 500 }}>
                    {email}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setView("form");
                    setEmail("");
                  }}
                  style={{
                    color: "var(--dawn-40)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    marginTop: "24px",
                    padding: 0,
                  }}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
