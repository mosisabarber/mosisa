/**
 * Better Auth config — staff/admin authentication only (AGENTS.md §6).
 *
 * - The public site has NO auth; only /admin routes check sessions server-side.
 * - Tables live in db/schema.ts: staff_users (extended with `role`),
 *   staff_sessions, staff_accounts, staff_verifications.
 * - Staff accounts are created manually (seed or direct DB insert) — no
 *   public staff signup form.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.staffUsers,
      session: schema.staffSessions,
      account: schema.staffAccounts,
      verification: schema.staffVerifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "staff",
        input: false, // never settable through signup input
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
