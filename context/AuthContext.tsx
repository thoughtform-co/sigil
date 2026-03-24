"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getProfileName } from "@/lib/profile-name";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  displayName: string | null;
  username: string | null;
  profileName: string | null;
  role: "admin" | "user" | null;
  isAdmin: boolean;
  /** Non-null when this user is a workshop participant locked to one journey. */
  lockedWorkspaceProjectId: string | null;
  isWorkshopLocked: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export type InitialAuthUser = {
  id: string;
  email: string | null;
  username?: string | null;
  displayName?: string | null;
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
  const [displayName, setDisplayName] = useState<string | null>(initialUser?.displayName ?? null);
  const [username, setUsername] = useState<string | null>(initialUser?.username ?? null);
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
          username?: string | null;
          displayName?: string | null;
          lockedWorkspaceProjectId?: string | null;
        };
      };
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email } as User);
        setRole(data.profile?.role ?? null);
        setUsername(data.profile?.username ?? null);
        setDisplayName(data.profile?.displayName ?? null);
        const r = data.profile?.role;
        setLockedWorkspaceProjectId(
          r === "admin" ? null : (data.profile?.lockedWorkspaceProjectId ?? null),
        );
      } else {
        setRole(null);
        setUsername(null);
        setDisplayName(null);
        setLockedWorkspaceProjectId(null);
      }
    } catch {
      setRole(null);
      setUsername(null);
      setDisplayName(null);
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
        setUsername(null);
        setDisplayName(null);
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
      displayName,
      username,
      profileName: user
        ? getProfileName({
            displayName,
            username,
            email: user.email,
            id: user.id,
          })
        : null,
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
        setDisplayName(null);
        setUsername(null);
        setRole(null);
        setLockedWorkspaceProjectId(null);
      },
      refreshProfile: hydrateFromMe,
    }),
    [displayName, loading, lockedWorkspaceProjectId, role, session, user, username],
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
