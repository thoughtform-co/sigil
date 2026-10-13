import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  const usesSessionPooler = /pooler\.supabase\.com:5432/i.test(databaseUrl);
  if (usesSessionPooler) {
    console.warn(
      "[SIGIL] DATABASE_URL points to the Supabase session pooler (port 5432). Consider using the transaction pooler (port 6543) with ?pgbouncer=true&connection_limit=1 for better serverless stability.",
    );
  }
  if (!/connection_limit=/i.test(databaseUrl) && /pooler\.supabase\.com/i.test(databaseUrl)) {
    console.warn(
      "[SIGIL] DATABASE_URL missing connection_limit parameter. Add ?connection_limit=1 for serverless stability.",
    );
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaLogLevel: ("query" | "error" | "warn" | "info")[] =
  process.env.PRISMA_LOG === "verbose"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: prismaLogLevel });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// No warm-up query here. One used to run on module load, without being awaited. On Vercel a
// function is frozen as soon as it has answered, so on a cold start that answers without the
// database (a 401 from /api/mcp, a discovery document) the warm-up stopped mid-transaction and
// held a pooler connection until the instance woke again. Prisma connects on the first query.
