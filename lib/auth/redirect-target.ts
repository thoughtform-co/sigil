export const DEFAULT_AUTH_REDIRECT_PATH = "/projects";
export const AUTH_COMPLETE_PATH = "/auth/complete";

export function sanitizeAuthRedirectPath(nextPath: string | null | undefined): string | null {
  if (!nextPath) return null;
  if (!nextPath.startsWith("/")) return null;
  if (nextPath.startsWith("//")) return null;
  if (nextPath.includes("\\")) return null;
  if (/[\r\n]/.test(nextPath)) return null;
  return nextPath;
}

export function resolveAuthRedirectPath(
  nextPath: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT_PATH,
): string {
  return sanitizeAuthRedirectPath(nextPath) ?? fallback;
}

export function buildAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const url = new URL(AUTH_COMPLETE_PATH, origin);
  const safeNext = sanitizeAuthRedirectPath(nextPath);
  if (safeNext) {
    url.searchParams.set("next", safeNext);
  }
  return url.toString();
}

export function getInviteDestinationPath(workspaceProjectId?: string | null): string {
  return workspaceProjectId
    ? `/journeys/${workspaceProjectId}`
    : DEFAULT_AUTH_REDIRECT_PATH;
}
