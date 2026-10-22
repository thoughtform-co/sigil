import type { NextConfig } from "next";

/**
 * Next.js App Router emits inline flight/hydration scripts (`self.__next_f.push(...)`).
 * A hash-only script-src blocks those and breaks client interactivity in production.
 * `unsafe-inline` is required until we adopt nonce-based CSP via middleware.
 * @see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
function contentSecurityPolicy(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    [
      "connect-src 'self' blob:",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://replicate.delivery",
      "https://*.replicate.delivery",
      "https://fal.media",
      "https://*.fal.media",
    ].join(" "),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The plot worker of Expo City (/expo/assets/plot.worker-*.js) runs students' code. */
const EXPO_PLOT_WORKER_CSP = "default-src 'none'; script-src 'self'";

/** Where Expo City is deployed: the expo-city project's production domain. */
const EXPO_CITY_ORIGIN = process.env.EXPO_CITY_ORIGIN ?? "https://expo-city-gamma.vercel.app";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hrgxfbyrumeyftqrlehv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "*.replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "*.fal.media",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },
  // sharp (image previews for the MCP server) loads libvips from a sibling package at run time,
  // which file tracing does not follow on its own.
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/mcp": ["./node_modules/@img/**/*"],
    // Expo City's character creator cuts every view out of its ground with sharp (lib/headless/avatar.ts)
    "/api/expo/avatar": ["./node_modules/@img/**/*"],
    "/api/expo/avatar/keep": ["./node_modules/@img/**/*"],
    "/api/expo/avatar/uploads": ["./node_modules/@img/**/*"],
    "/api/expo/avatar/[job]": ["./node_modules/@img/**/*"],
    "/api/expo/me": ["./node_modules/@img/**/*"],
  },
  experimental: {
    optimizePackageImports: ["@xyflow/react"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        canvas: false,
      };
    }
    return config;
  },
  // Expo City is built and deployed from its own repository (thoughtform-co/expo-city, Vercel project
  // expo-city, served under /expo/ there too) and shown here at /expo, so the game stays on Sigil's
  // origin, beside the sign-in cookie and /api/expo/*. A merged plot is live without a Sigil deploy.
  async rewrites() {
    return [
      { source: "/expo", destination: `${EXPO_CITY_ORIGIN}/expo/` },
      { source: "/expo/:path*", destination: `${EXPO_CITY_ORIGIN}/expo/:path*` },
    ];
  },
  async headers() {
    const baseHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ] as { key: string; value: string }[];

    const csp = contentSecurityPolicy();
    if (csp) {
      baseHeaders.push({ key: "Content-Security-Policy", value: csp });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
      // Expo City's plot worker runs students' code: it may load its own script and nothing else,
      // so that code cannot make a request. Listed last, so its policy replaces the app's for this
      // one file pattern (Next.js: the last match of a header key wins).
      {
        source: "/expo/assets/:file(plot\\.worker-[^/]*)",
        headers: [{ key: "Content-Security-Policy", value: EXPO_PLOT_WORKER_CSP }],
      },
    ];
  },
};

export default nextConfig;
