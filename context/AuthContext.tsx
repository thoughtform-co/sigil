"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: "admin" | "user" | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_BYPASS = process.env.NEXT_PUBLIC_SIGIL_AUTH_BYPASS === "true";
const BYPASS_USER_ID = "00000000-0000-4000-8000-000000000001";
const BYPASS_USER_EMAIL = "sigil-local@thoughtform.dev";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    AUTH_BYPASS
      ? ({
          id: BYPASS_USER_ID,
          email: BYPASS_USER_EMAIL,
        } as unknown as User)
      : null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(AUTH_BYPASS ? "admin" : null);
  const [loading, setLoading] = useState(!AUTH_BYPASS);

  async function hydrateRole() {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) {
        setRole(null);
        return;
      }
      const data = (await response.json()) as { profile?: { role?: "admin" | "user" } };
      setRole(data.profile?.role ?? null);
    } catch {
      setRole(null);
    }
  }

  useEffect(() => {
    if (AUTH_BYPASS) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void hydrateRole();
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        void hydrateRole();
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      isAdmin: role === "admin",
      loading,
      signOut: async () => {
        if (AUTH_BYPASS) return;
        const supabase = createClient();
        await supabase.auth.signOut();
        setRole(null);
      },
    }),
    [loading, role, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
