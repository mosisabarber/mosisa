import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit only auto-loads `.env`; also load `.env.local` (Next.js style)
// so the Neon URL set there is picked up for `db:migrate`.
config({ path: ".env.local" });
config({ path: ".env" });

// DATABASE_URL is required for `db:migrate` (against Neon), but `db:generate`
// must also work without a live connection (it only reads ./db/schema.ts).
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
