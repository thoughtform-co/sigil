"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/projects" }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const label = mode === "login" ? "sign in" : "create account";

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
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md border border-[var(--dawn-08)] bg-[var(--surface-0)] p-6"
    >
      <h1
        className="mb-5"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dawn)",
        }}
      >
        {label}
      </h1>

      <div className="mb-3 flex flex-col gap-2">
        <label
          htmlFor="email"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-50)",
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
          className="border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-sm text-[var(--dawn)] outline-none"
        />
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <label
          htmlFor="password"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn-50)",
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
          className="border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-sm text-[var(--dawn)] outline-none"
        />
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full border border-[var(--gold)] px-3 py-2 text-xs uppercase tracking-[0.08em] text-[var(--gold)] disabled:opacity-60"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {loading ? "processing..." : label}
      </button>
    </form>
  );
}
