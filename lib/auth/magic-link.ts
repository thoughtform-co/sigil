import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

type SendMagicLinkEmailInput = {
  email: string;
  emailRedirectTo: string;
};

export async function sendMagicLinkEmail({
  email,
  emailRedirectTo,
}: SendMagicLinkEmailInput) {
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });
}
