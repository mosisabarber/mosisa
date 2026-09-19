/**
 * Seed a staff account manually (AGENTS.md §6 — no public staff signup).
 *
 * Usage:
 *   npm run seed:staff -- "Full Name" "email@example.com" "password" [role]
 *   e.g. npm run seed:staff -- "Mosisa" "admin@mosisa.et" "s3cure-pass" admin
 *
 * Role is optional (default: staff). Requires a real DATABASE_URL in
 * .env.local and migrations applied (`npm run db:migrate`) first.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const [name, email, password, role] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error(
      'Usage: npm run seed:staff -- "Full Name" "email@example.com" "password" [role]\n' +
        'Example: npm run seed:staff -- "Mosisa" "admin@mosisa.et" "s3cure-pass" admin'
    );
    process.exit(1);
  }

  const { auth } = await import("../lib/auth");
  const { db } = await import("../db/client");
  const { staffUsers } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

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
