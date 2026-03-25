/** Server-hydrated auth snapshot passed into AuthProvider. */

export type InitialAuthUser = {
  id: string;
  email: string | null;
  username?: string | null;
  displayName?: string | null;
  role: "admin" | "user";
  /** Workshop lock: non-admins with this set are confined to this journey id. */
  lockedWorkspaceProjectId?: string | null;
};
