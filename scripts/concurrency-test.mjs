/**
 * Stage 2 acceptance test (AGENTS.md §3):
 * Two concurrent overlapping `confirmed` appointments for the same barber
 * must be rejected by the `no_overlapping_appointments` EXCLUDE constraint —
 * exactly one insert succeeds, one fails with Postgres 23P01
 * (exclusion_violation) which the app layer will catch and map to
 * "slot no longer available" (§5).
 *
 * Run AFTER `npm run db:migrate` with a real DATABASE_URL in .env.local:
 *   node scripts/concurrency-test.mjs
 *
 * Uses raw SQL only (no schema import) and cleans up after itself.
 */
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes("user:password")) {
  console.error(
    "Set a real DATABASE_URL in .env.local first (paste your Neon connection string)."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  // --- seed a throwaway barber + service + shop hours row -------------------
  const seed = await pool.query(
    `INSERT INTO barbers (name, slug) VALUES ('Concurrency Test Barber', 'concurrency-test')
     RETURNING id`
  );
  const barberId = seed.rows[0].id;

  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const end = new Date(start.getTime() + 30 * 60 * 1000); // +30 min

  const svc = await pool.query(
    `INSERT INTO services (name, duration_minutes, price)
     VALUES ('Concurrency Test Cut', 30, 100) RETURNING id`
  );
  const serviceId = svc.rows[0].id;

  const token = () =>
    Array.from({ length: 2 }, () =>
      Math.random().toString(36).slice(2, 12)
    ).join("-");

  // --- fire two overlapping inserts concurrently ----------------------------
  const insertSQL = `
    INSERT INTO appointments
      (barber_id, service_id, customer_name, customer_phone, customer_email,
       start_datetime, end_datetime, management_token)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`;

  const attempt = (name) =>
    pool.query(insertSQL, [
      barberId,
      serviceId,
      name,
      "+251900000000",
      `${name.toLowerCase()}@example.com`,
      start,
      end,
      token(),
    ]);

  const [a, b] = await Promise.allSettled([attempt("A"), attempt("B")]);

  const ok = a.status === "fulfilled" ? a : b;
  const failed = a.status === "rejected" ? a : b;

  let pass = true;

  if (ok.status !== "fulfilled") {
    console.error("FAIL: neither insert succeeded.");
    pass = false;
  }

  const reason = failed.reason;
  const code = reason?.code ?? reason?.cause?.code;
  if (failed.status !== "rejected" || code !== "23P01") {
    console.error(
      `FAIL: the second insert did not fail with 23P01 (exclusion_violation). Got:`,
      failed.status === "rejected" ? reason : "fulfilled"
    );
    pass = false;
  }

  console.log(
    pass
      ? "PASS: one insert succeeded, the other failed cleanly with 23P01 (exclusion_violation)."
      : "ACCEPTANCE TEST FAILED — do not proceed to Stage 3 until this passes."
  );

  // --- cleanup ---------------------------------------------------------------
  await pool.query(`DELETE FROM appointments WHERE barber_id = $1`, [barberId]);
  await pool.query(`DELETE FROM services WHERE id = $1`, [serviceId]);
  await pool.query(`DELETE FROM barbers WHERE id = $1`, [barberId]);
  await pool.end();

  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error("Test crashed:", err);
  process.exit(1);
});
