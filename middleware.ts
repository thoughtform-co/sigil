import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const PUBLIC_PREFIXES = ["/auth/", "/api/auth/"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

const AUTH_BYPASS =
  process.env.NODE_ENV === "development" &&
  (process.env.SIGIL_AUTH_BYPASS === "true" ||
    process.env.NEXT_PUBLIC_SIGIL_AUTH_BYPASS === "true");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    data: { user },
  } = await supabase.auth.getUser();

  if (AUTH_BYPASS) {
    return response;
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    if (!pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
