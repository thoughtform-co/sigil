import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SIGIL_AUTH_BYPASS: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  KLING_ACCESS_KEY: z.string().optional(),
  KLING_SECRET_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_PROMPT_ENHANCE_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsed: Env | null = null;

/**
 * Parse and validate env. Does not throw; returns partial result for optional vars.
 * Use getRequiredEnv() for vars that must exist at runtime.
 */
export function getEnv(): Env {
  if (parsed) return parsed;
  parsed = envSchema.parse(process.env) as Env;
  return parsed;
}

const requiredForServer = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
] as const;

/**
 * Call from server code paths that need Supabase/DB. Throws if any required var is missing.
 */
export function assertServerEnv(): Env {
  const env = getEnv();
  const missing = requiredForServer.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}. See .env.example.`);
  }
  return env;
}
