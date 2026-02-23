"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const AUTH_BYPASS = process.env.NEXT_PUBLIC_SIGIL_AUTH_BYPASS === "true";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (AUTH_BYPASS) return;
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/projects")}`);
    }
  }, [loading, pathname, router, user]);

  if (AUTH_BYPASS) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--void)] text-[var(--dawn-50)]">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          checking session
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
