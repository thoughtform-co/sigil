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
      router.replace("/projects");
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
        className={`relative z-10 flex items-center justify-center min-h-screen px-4 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="w-full max-w-sm">
          <div
            className="rounded-xl border p-8 shadow-2xl relative"
            style={{
              background: "rgba(10, 9, 8, 0.75)",
              borderColor: "var(--dawn-15)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
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

            <div className="text-center mb-8">
              <span
                className="block text-4xl mb-3 select-none"
                style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}
                aria-hidden="true"
              >
                ᛭
              </span>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--dawn)", fontFamily: "var(--font-mono)" }}
              >
                SIGIL
              </h1>
              <p
                className="mt-1.5 text-sm font-light tracking-wide"
                style={{
                  color: "var(--dawn-40)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Generation Platform
              </p>
            </div>

            {(view === "form" || view === "error") && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                    style={{
                      color: "var(--dawn-40)",
                      fontFamily: "var(--font-mono)",
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
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--gold-30)]"
                    style={{
                      color: "var(--dawn)",
                      background: "var(--dawn-04)",
                      border: "1px solid var(--dawn-08)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>

                {IS_DEV && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                      style={{
                        color: "var(--dawn-40)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Password
                      <span
                        className="ml-2 normal-case tracking-normal"
                        style={{ color: "var(--dawn-30)", fontSize: "9px" }}
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
                      className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--gold-30)]"
                      style={{
                        color: "var(--dawn)",
                        background: "var(--dawn-04)",
                        border: "1px solid var(--dawn-08)",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                )}

                {view === "error" && errorMsg && (
                  <p
                    className="text-xs"
                    style={{
                      color: "var(--status-error)",
                      fontFamily: "var(--font-mono)",
                    }}
                    role="alert"
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-[var(--gold-30)] focus:ring-offset-2 focus:ring-offset-[var(--void)]"
                  style={{
                    color: "var(--void)",
                    background: "var(--gold)",
                    fontFamily: "var(--font-mono)",
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
              <div className="text-center space-y-4 py-2">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "var(--gold-10)" }}
                >
                  <svg
                    className="h-6 w-6"
                    style={{ color: "var(--gold)" }}
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
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: "var(--dawn)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Check your email
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: "var(--dawn-40)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    We sent a magic link to{" "}
                    <span className="font-medium" style={{ color: "var(--dawn-70)" }}>
                      {email}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView("form");
                    setEmail("");
                  }}
                  className="text-xs underline underline-offset-2 transition-colors"
                  style={{
                    color: "var(--dawn-40)",
                    fontFamily: "var(--font-mono)",
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
