import "server-only";

import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production.");
}

declare global {
  // eslint-disable-next-line no-var
  var garmentosPgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add it to .env.local.");
  }

  return new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined,
    application_name: "garmentos-web",
  });
}

/**
 * Server-only PostgreSQL pool.
 * Never import this module from a Client Component or expose DATABASE_URL
 * through a NEXT_PUBLIC_ environment variable.
 */
export const db = globalThis.garmentosPgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.garmentosPgPool = db;
}

export async function checkDatabaseConnection(): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}
