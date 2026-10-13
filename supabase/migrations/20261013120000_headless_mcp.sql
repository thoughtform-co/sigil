-- Headless Sigil: the MCP server at /api/mcp and its per-person sign-in (OAuth 2.1).
--
-- Additive and idempotent. Apply before deploying the code that reads it:
--   npx prisma db execute --file supabase/migrations/20261013120000_headless_mcp.sql --schema prisma/schema.prisma
--
-- One headless_credentials row per person and client (claude.ai, claude.com, loopback): the rate
-- buckets and usage logs stay on that row across token refreshes. Access and refresh tokens live
-- in mcp_oauth_tokens and authorization codes in mcp_oauth_codes, all as sha256 hashes, so a
-- database read never yields a usable token. No provider key is stored or handed out anywhere.

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "mcp_access" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "headless_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'oauth',
  "oauth_client_id" TEXT,
  "oauth_client_name" TEXT,
  "oauth_client_key" TEXT,
  "subject_email" TEXT,
  "rate_limit_per_minute" INTEGER,
  "rate_limit_per_day" INTEGER,
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "revoked_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "headless_credentials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "headless_credentials_owner_id_idx" ON "headless_credentials" ("owner_id");
CREATE INDEX IF NOT EXISTS "headless_credentials_revoked_at_idx" ON "headless_credentials" ("revoked_at");
-- One live connection per person and client key.
CREATE UNIQUE INDEX IF NOT EXISTS "headless_credentials_oauth_active_uq"
  ON "headless_credentials" ("owner_id", "oauth_client_key")
  WHERE "kind" = 'oauth' AND "revoked_at" IS NULL;
DO $$ BEGIN
  ALTER TABLE "headless_credentials" ADD CONSTRAINT "headless_credentials_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "headless_usage_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credential_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "tool_name" TEXT,
  "model_id" TEXT,
  "status" TEXT NOT NULL,
  "error_category" TEXT,
  "duration_ms" INTEGER NOT NULL,
  "cost_usd" DECIMAL(10,6),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "headless_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "headless_usage_logs_credential_id_created_at_idx"
  ON "headless_usage_logs" ("credential_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "headless_usage_logs_owner_id_created_at_idx"
  ON "headless_usage_logs" ("owner_id", "created_at" DESC);
DO $$ BEGIN
  ALTER TABLE "headless_usage_logs" ADD CONSTRAINT "headless_usage_logs_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "headless_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "headless_rate_buckets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credential_id" UUID NOT NULL,
  "window" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "headless_rate_buckets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "headless_rate_buckets_credential_id_window_bucket_key"
  ON "headless_rate_buckets" ("credential_id", "window", "bucket");
CREATE INDEX IF NOT EXISTS "headless_rate_buckets_bucket_idx" ON "headless_rate_buckets" ("bucket");
DO $$ BEGIN
  ALTER TABLE "headless_rate_buckets" ADD CONSTRAINT "headless_rate_buckets_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "headless_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "mcp_oauth_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code_hash" TEXT NOT NULL,
  "profile_id" UUID NOT NULL,
  "credential_id" UUID NOT NULL,
  "client_id" TEXT NOT NULL,
  "redirect_uri" TEXT NOT NULL,
  "code_challenge" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mcp_oauth_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_oauth_codes_code_hash_key" ON "mcp_oauth_codes" ("code_hash");
CREATE INDEX IF NOT EXISTS "mcp_oauth_codes_expires_at_idx" ON "mcp_oauth_codes" ("expires_at");
DO $$ BEGIN
  ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "headless_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "mcp_oauth_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credential_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "family_id" UUID NOT NULL,
  "parent_id" UUID,
  "code_id" UUID,
  "client_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "family_expires_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mcp_oauth_tokens_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_kind_chk" CHECK ("kind" IN ('access', 'refresh'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_oauth_tokens_token_hash_key" ON "mcp_oauth_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "mcp_oauth_tokens_credential_id_idx" ON "mcp_oauth_tokens" ("credential_id");
CREATE INDEX IF NOT EXISTS "mcp_oauth_tokens_family_id_idx" ON "mcp_oauth_tokens" ("family_id");
CREATE INDEX IF NOT EXISTS "mcp_oauth_tokens_expires_at_idx" ON "mcp_oauth_tokens" ("expires_at");
DO $$ BEGIN
  ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "headless_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_code_id_fkey"
    FOREIGN KEY ("code_id") REFERENCES "mcp_oauth_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role only, like every other table (see 00000000000000_baseline_rls.sql).
ALTER TABLE "headless_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "headless_usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "headless_rate_buckets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_oauth_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_oauth_tokens" ENABLE ROW LEVEL SECURITY;
