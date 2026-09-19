import "dotenv/config";
import { defineConfig } from "drizzle-kit";

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
