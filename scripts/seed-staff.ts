/**
 * Seed a staff account manually (AGENTS.md §6 — no public staff signup).
 *
 * Usage:
 *   npm run seed:staff -- "Full Name" "email@example.com" "password" [role]
 *   npx tsx scripts/seed-staff.ts "Full Name" "email@example.com" "password" [role]
 *   e.g. npm run seed:staff -- "Mosisa" "admin@mosisa.et" "s3cure-pass" admin
 *
 * Role is optional (default: staff). Requires a real DATABASE_URL in
 * .env.local and migrations applied (`npm run db:migrate`) first.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const USAGE =
  'Usage: npm run seed:staff -- "Full Name" "email@example.com" "password" [role]\n' +
  'Example: npm run seed:staff -- "Mosisa" "admin@mosisa.et" "s3cure-pass" admin';

/** Minimal shape check — Better Auth does the authoritative validation. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  // A literal "--" is npm's argument separator. `npm run` strips it, but
  // `npx tsx scripts/seed-staff.ts -- a b c` passes it through as argv[0],
  // which would silently shift every argument by one. Drop it if present.
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const [name, email, password, role] = args;

  if (!name || !email || !password) {
    console.error(USAGE);
    process.exit(1);
  }

  // Fail fast with an actionable message instead of surfacing Better Auth's
  // "[body.email] Invalid email address" (which is confusing when the real
  // problem is a shifted/or missing argument).
  if (!EMAIL_RE.test(email)) {
    console.error(
      `✖ "${email}" is not a valid email address.\n` +
        `  Check the argument order — it should be: name, email, password, [role].\n` +
        `  ${USAGE}`
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("✖ Password must be at least 8 characters.");
    process.exit(1);
  }

  if (role && !["staff", "admin"].includes(role)) {
    console.error(`✖ Unknown role "${role}". Expected "staff" or "admin".`);
    process.exit(1);
  }

  const { auth } = await import("../lib/auth");
  const { db } = await import("../db/client");
  const { staffUsers } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  const existing = await db
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);
  if (existing.length > 0) {
    console.error(
      `✖ A staff account for ${email} already exists. ` +
        `Use a different email, or update the existing row directly.`
    );
    process.exit(1);
  }

  try {
    const created = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (role) {
      await db
        .update(staffUsers)
        .set({ role })
        .where(eq(staffUsers.email, email));
    }

    console.log(
      `✔ Staff account created: ${created?.user?.email ?? email} (role: ${
        role ?? "staff"
      })`
    );
    process.exit(0);
  } catch (err) {
    console.error("✖ Failed to create staff account:", err);
    process.exit(1);
  }
}

void main();
