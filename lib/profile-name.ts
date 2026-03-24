export type ProfileNameLike = {
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  id?: string | null;
};

export function normalizeDisplayNameInput(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getProfileName({
  displayName,
  username,
  email,
  id,
}: ProfileNameLike): string {
  const normalizedDisplayName = normalizeDisplayNameInput(displayName);
  if (normalizedDisplayName) return normalizedDisplayName;

  const normalizedUsername = normalizeDisplayNameInput(username);
  if (normalizedUsername) return normalizedUsername;

  const emailLocalPart = normalizeDisplayNameInput(email?.split("@")[0] ?? null);
  if (emailLocalPart) return emailLocalPart;

  if (id) return `user-${id.slice(0, 8)}`;
  return "User";
}
