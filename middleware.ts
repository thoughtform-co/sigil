import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { withCorrelationId } from "@/lib/api/correlation";

/**
 * Auth contract: HTML routes are session-gated below. `/api/*` is NOT authenticated here — each
 * `route.ts` must call `getAuthedUser()` / `requireAdmin()` or be intentionally public (e.g.
 * `POST /api/auth/check-email`). See `AGENTS.md` and contract tests under `tests/contracts/`.
 */
const PUBLIC_PREFIXES = ["/auth/", "/api/auth/", "/events/"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

const AUTH_BYPASS =
  process.env.NODE_ENV === "development" && process.env.SIGIL_AUTH_BYPASS === "true";

const PUBLIC_DEMO =
  process.env.NODE_ENV === "development" && process.env.SIGIL_PUBLIC_DEMO === "true";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (AUTH_BYPASS || PUBLIC_DEMO) {
    return withCorrelationId(request, NextResponse.next({ request }));
  }

  if (isPublicPath(pathname)) {
    return withCorrelationId(request, NextResponse.next({ request }));
  }

  if (pathname.startsWith("/api/")) {
    return withCorrelationId(request, NextResponse.next({ request }));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (pathname === "/login" && session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    return NextResponse.redirect(url);
  }

  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return withCorrelationId(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
