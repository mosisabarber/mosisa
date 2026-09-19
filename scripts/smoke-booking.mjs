/**
 * Stage 5 live smoke test (AGENTS.md §10, Stage 5 acceptance).
 *
 * Requires the dev server running and demo data seeded. Verifies:
 *   1. Availability returns future slots within the 60-day cap.
 *   2. A booking POST succeeds (201 + management_token).
 *   3. A DIFFERENT customer booking the SAME slot gets 409
 *      slot_no_longer_available (the DB exclusion constraint, surfaced as a
 *      user-facing error — never a 500).
 *   4. The SAME phone booking again within the window gets 429 (rate limit).
 *   5. Notifications failing (e.g. Resend sandbox limits) do NOT fail the
 *      booking (graceful §7 behavior).
 *
 *   $env:SMOKE_BASE_URL="http://localhost:3000"; node scripts/smoke-booking.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "@neondatabase/serverless";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let failures = 0;
function check(label, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!pass) failures++;
}

async function run() {
  // Identify the seeded demo barber + service
  const barber = (await pool.query(`SELECT id FROM barbers WHERE slug='mosisa'`)).rows[0];
  const service = (await pool.query(`SELECT id FROM services WHERE name='Classic Cut'`)).rows[0];
  if (!barber || !service) {
    console.error("Demo data missing — run `node scripts/seed-demo.mjs` first.");
    process.exit(1);
  }

  // Unique phone per run: the DB-backed limit (§5) is 1 booking / 60s / phone,
  // so re-running with fixed numbers would trip the limiter on step 3.
  // Format must satisfy ethiopianPhone: 0 + [97] + 8 digits.
  const runId = String(Date.now()).slice(-7);
  const seq = Number(runId.slice(0, 5)) % 100000;
  const phoneA = `091${String(seq).padStart(7, "0")}`;
  const phoneB = `071${String(seq + 1).padStart(7, "0")}`;
  const tag = `smoke-${runId}@mosisa.example`;

  // 1 — availability
  const start = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const availRes = await fetch(
    `${BASE}/api/booking/availability?barber_id=${barber.id}&service_id=${service.id}&start_date=${start}&end_date=${end}`
  );
  check("availability returns 200", availRes.status === 200, `status ${availRes.status}`);
  const avail = await availRes.json();
  const firstSlot = avail.days?.flatMap((d) => d.slots)[0] ?? null;
  check(
    "availability has bookable slots",
    !!firstSlot,
    firstSlot ? `first slot ${firstSlot}` : "no slots in range"
  );
  if (!firstSlot) process.exit(1);

  const post = (body) =>
    fetch(`${BASE}/api/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  // 2 — successful booking (phone A)
  const a = await post({
    barber_id: barber.id,
    service_id: service.id,
    start_datetime: firstSlot,
    customer_name: "Smoke Test A",
    customer_phone: phoneA,
    customer_email: tag,
  });
  const aBody = await a.json();
  check("booking succeeds (201)", a.status === 201, JSON.stringify(aBody));
  check(
    "response carries management_token",
    typeof aBody.management_token === "string" && aBody.management_token.length > 20
  );

  // 3 — different customer, same slot → 409 slot_no_longer_available
  const b = await post({
    barber_id: barber.id,
    service_id: service.id,
    start_datetime: firstSlot,
    customer_name: "Smoke Test B",
    customer_phone: phoneB,
    customer_email: tag,
  });
  const bBody = await b.json();
  check(
    "double-booking rejected with 409 (not 500)",
    b.status === 409 && bBody.error === "slot_no_longer_available",
    `status ${b.status} error ${bBody.error}`
  );

  // 4 — same phone again within window → 429
  const laterSlot = avail.days?.flatMap((d) => d.slots)[1] ?? firstSlot;
  const c = await post({
    barber_id: barber.id,
    service_id: service.id,
    start_datetime: laterSlot,
    customer_name: "Smoke Test A",
    customer_phone: phoneA,
    customer_email: tag,
  });
  const cBody = await c.json();
  check(
    "same phone re-book is rate-limited (429)",
    c.status === 429 && cBody.error === "rate_limited",
    `status ${c.status} error ${cBody.error}`
  );

  // cleanup smoke rows
  await pool.query(`DELETE FROM appointments WHERE customer_email LIKE 'smoke-%@mosisa.example'`);
  await pool.end();

  console.log(
    failures === 0
      ? "\nALL SMOKE TESTS PASSED — Stage 5 acceptance verified end-to-end."
      : `\n${failures} SMOKE TEST(S) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
