/**
 * One-off: list staff accounts (emails/roles — passwords are hashed, unreadable).
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL ?? "");
  const rows = await sql`SELECT email, name, role, created_at FROM staff_users ORDER BY created_at`;
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

void main();