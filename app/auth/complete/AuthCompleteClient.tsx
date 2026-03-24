"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-target";

export function AuthCompleteClient({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const destination = useMemo(
    () => resolveAuthRedirectPath(nextPath),
    [nextPath],
  );

  useEffect(() => {
    const supabase = createClient();
    let finished = false;

    const complete = (href: string) => {
      if (finished) return;
      finished = true;
      router.replace(href);
      router.refresh();
    };

    const fail = () => {
      if (finished) return;
      finished = true;
      router.replace("/login?error=auth");
    };

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        complete(destination);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        complete(destination);
      }
    });

    void checkSession();
    const checks = [250, 1000, 2500].map((delay) =>
      window.setTimeout(() => {
        void checkSession();
      }, delay),
    );
    const fallback = window.setTimeout(() => {
      void checkSession().finally(() => {
        if (!finished) fail();
      });
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      checks.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(fallback);
    };
  }, [destination, router]);

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
        completing sign in
      </span>
    </div>
  );
}
