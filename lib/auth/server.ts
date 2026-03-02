import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email: string | null;
};

const AUTH_BYPASS =
  process.env.NODE_ENV === "development" && process.env.SIGIL_AUTH_BYPASS === "true";
const BYPASS_USER_ID = "dcd1da5c-773c-4029-910c-e360fa415fd0";
const BYPASS_USER_EMAIL = "vince@thoughtform.co";

let bypassEnsured = false;

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const authStart = Date.now();
  if (AUTH_BYPASS) {
    if (!bypassEnsured) {
      bypassEnsured = true;
      await prisma.profile.upsert({
        where: { id: BYPASS_USER_ID },
        update: {
          role: "admin",
          displayName: "Sigil Local",
        },
        create: {
          id: BYPASS_USER_ID,
          username: "sigil-local",
          displayName: "Sigil Local",
          role: "admin",
        },
      });
    }
    // #region agent log
    void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId:'baseline',hypothesisId:'H4',location:'lib/auth/server.ts:bypass',message:'Auth bypass branch used',data:{elapsedMs:Date.now()-authStart,bypassEnsured},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return { id: BYPASS_USER_ID, email: BYPASS_USER_EMAIL };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // #region agent log
  void fetch('http://127.0.0.1:7607/ingest/a5f326c6-d7b4-482d-b1ae-86a7f55d4947',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0e67a0'},body:JSON.stringify({sessionId:'0e67a0',runId:'baseline',hypothesisId:'H1',location:'lib/auth/server.ts:get-user',message:'Supabase auth.getUser completed',data:{elapsedMs:Date.now()-authStart,hasUser:Boolean(user),hasError:Boolean(error)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function ensureProfile(user: AuthedUser) {
  await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      username: user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`,
      displayName: user.email ?? "Sigil User",
    },
  });
}
