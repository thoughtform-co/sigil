"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: "admin" | "user" | null;
  isAdmin: boolean;
  /** Non-null when this user is a workshop participant locked to one journey. */
  lockedWorkspaceProjectId: string | null;
  isWorkshopLocked: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

export type InitialAuthUser = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  /** Workshop lock: non-admins with this set are confined to this journey id. */
  lockedWorkspaceProjectId?: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: InitialAuthUser | null;
}) {
  const [user, setUser] = useState<User | null>(
    initialUser ? ({ id: initialUser.id, email: initialUser.email } as User) : null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(initialUser?.role ?? null);
  const [lockedWorkspaceProjectId, setLockedWorkspaceProjectId] = useState<string | null>(
    initialUser?.role === "admin" ? null : (initialUser?.lockedWorkspaceProjectId ?? null),
  );
  const [loading, setLoading] = useState(!initialUser);

  async function hydrateFromMe() {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        setRole(null);
        setLockedWorkspaceProjectId(null);
        setUser(null);
        return;
      }
      const data = (await response.json()) as {
        user?: { id: string; email: string | null };
        profile?: {
          role?: "admin" | "user";
          lockedWorkspaceProjectId?: string | null;
        };
      };
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email } as User);
        setRole(data.profile?.role ?? null);
        const r = data.profile?.role;
        setLockedWorkspaceProjectId(
          r === "admin" ? null : (data.profile?.lockedWorkspaceProjectId ?? null),
        );
      } else {
        setRole(null);
        setLockedWorkspaceProjectId(null);
      }
    } catch {
      setRole(null);
      setLockedWorkspaceProjectId(null);
    }
  }

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        if (!initialUser) {
          void hydrateFromMe();
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        setRole(null);
        setLockedWorkspaceProjectId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      isAdmin: role === "admin",
      lockedWorkspaceProjectId,
      isWorkshopLocked: role !== "admin" && lockedWorkspaceProjectId != null,
      loading,
      signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setRole(null);
        setLockedWorkspaceProjectId(null);
      },
    }),
    [loading, lockedWorkspaceProjectId, role, session, user],
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
