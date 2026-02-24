/**
 * SSRF-safe URL validation for server-side fetch.
 * Blocks private IPs, localhost, and non-allowlisted hosts.
 */

const ALLOWED_HOSTS = new Set([
  "storage.googleapis.com",
  "generativelanguage.googleapis.com",
  "api.replicate.com",
  "replicate.delivery",
  "fal.media",
  "api.anthropic.com",
]);

const PRIVATE_IPV4_PREFIXES = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^127\./, // 127.0.0.0/8 loopback
  /^169\.254\./, // link-local
  /^0\./, // 0.0.0.0/8
];

const LOCALHOST_HOSTS = new Set(["localhost", "::1", "0.0.0.0"]);

function getHostname(url: URL): string {
  const host = url.hostname.toLowerCase();
  try {
    const decoded = decodeURIComponent(host);
    return decoded;
  } catch {
    return host;
  }
}

function isPrivateIPv4(host: string): boolean {
  return PRIVATE_IPV4_PREFIXES.some((re) => re.test(host));
}

function isIPv6Local(host: string): boolean {
  return host === "::1" || host.startsWith("::ffff:127.") || host.startsWith("fe80:");
}

/**
 * Validates that a URL is safe to fetch from (no SSRF).
 * Use for sourceUrl / output.url before server-side fetch.
 * @param rawUrl - URL string (http, https, or gs://)
 * @param options - allowGsToGoogleStorage: convert gs:// to https://storage.googleapis.com and allow that host
 * @returns Resolved HTTPS URL to use for fetch, or null if invalid/unsafe
 */
export function getSafeFetchUrl(
  rawUrl: string,
  options: { allowGsToGoogleStorage?: boolean } = {}
): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;

  const trimmed = rawUrl.trim();

  if (options.allowGsToGoogleStorage && trimmed.startsWith("gs://")) {
    const gsPath = trimmed.replace("gs://", "");
    const [bucket, ...pathParts] = gsPath.split("/");
    if (!bucket || bucket.length > 200) return null;
    const path = pathParts.join("/");
    const resolved = `https://storage.googleapis.com/${bucket}/${path}`;
    const url = safeParseUrl(resolved);
    if (!url) return null;
    if (getHostname(url) !== "storage.googleapis.com") return null;
    return resolved;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;

  const url = safeParseUrl(trimmed);
  if (!url) return null;
  if (url.protocol !== "https:") return null;

  const host = getHostname(url);
  if (LOCALHOST_HOSTS.has(host)) return null;
  if (isPrivateIPv4(host)) return null;
  if (isIPv6Local(host)) return null;
  if (!ALLOWED_HOSTS.has(host) && !host.endsWith(".supabase.co")) return null;

  return url.toString();
}

/**
 * Parse URL without throwing; returns null on invalid.
 */
function safeParseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/**
 * Assert version: throws if URL is unsafe. Use in call sites that must not fetch unsafe URLs.
 */
export function assertSafeFetchUrl(
  rawUrl: string,
  options: { allowGsToGoogleStorage?: boolean } = {}
): string {
  const safe = getSafeFetchUrl(rawUrl, options);
  if (safe === null) {
    throw new Error("URL is not allowed for server-side fetch (SSRF protection)");
  }
  return safe;
}
