"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-target";

type SupportedEmailOtpType =
  | "email"
  | "magiclink"
  | "invite"
  | "recovery"
  | "signup"
  | "email_change";

function resolveOtpType(type: string | null): SupportedEmailOtpType | null {
  switch (type) {
    case "email":
    case "magiclink":
    case "invite":
    case "recovery":
    case "signup":
    case "email_change":
      return type;
    default:
      return null;
  }
}

export function AuthCompleteClient({
  nextPath,
  code,
  tokenHash,
  type,
}: {
  nextPath: string | null;
  code: string | null;
  tokenHash: string | null;
  type: string | null;
}) {
  const router = useRouter();
  const destination = useMemo(
    () => resolveAuthRedirectPath(nextPath),
    [nextPath],
  );
  const otpType = useMemo(() => resolveOtpType(type), [type]);

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

    const completeFromHash = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        return false;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return false;
      }

      complete(destination);
      return true;
    };

    const completeFromQuery = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          complete(destination);
          return true;
        }
      }

      if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (!error) {
          complete(destination);
          return true;
        }
      }

      return false;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        complete(destination);
      }
    });

    const finishAuth = async () => {
      if (await completeFromHash()) return;
      if (await completeFromQuery()) return;
      await checkSession();
    };

    void finishAuth();
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
  }, [code, destination, otpType, router, tokenHash]);

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
