import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon Postgres connection (single shared instance).
 *
 * - Uses the @neondatabase/serverless WebSocket driver, which supports
 *   transactions (unlike neon-http) — required later for booking inserts
 *   that must catch the EXCLUDE-constraint violation (Stage 2+).
 * - DATABASE_URL comes from the environment (see .env.example). Never hardcode it.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
export type Db = typeof db;
