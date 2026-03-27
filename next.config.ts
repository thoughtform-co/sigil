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
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    [
      "connect-src 'self'",
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
    ];
  },
};

export default nextConfig;
