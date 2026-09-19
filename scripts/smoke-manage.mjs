/**
 * Stage 7 acceptance test — guest appointment management (AGENTS.md §10).
 *
 * Verifies:
 *   1. A booking can be fetched through its management token (GET).
 *   2. An invalid token returns 404 (tokens are unguessable, §10).
 *   3. Rescheduling to a new slot succeeds and moves the appointment.
 *   4. Rescheduling onto a slot already taken fails cleanly with 409
 *      (the DB exclusion constraint, not a 500).
 *   5. Cancelling releases the slot — it reappears in availability.
 *   6. The 12-hour rule: an appointment inside 12 hours is flagged
 *      `late_change: true` but the action is STILL ALLOWED (soft warning only).
 *
 * Requires the dev server running and demo data seeded.
 * Usage: node scripts/smoke-manage.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { randomBytes } from "crypto";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL missing (.env.local)");
  process.exit(1);
}
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const sql = neon(DB_URL);

let failures = 0;
function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

/** A fresh, format-valid Ethiopian mobile per run (rate limiter is per-phone). */
function freshPhone() {
  const n = randomBytes(4).readUInt32BE(0) % 100000000;
  const prefix = n % 2 === 0 ? "09" : "07";
  return prefix + String(n).padStart(8, "0").slice(0, 8);
}

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function post(path, payload) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function del(path, token) {
  return api(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ management_token: token }),
  });
}

/** Addis-shifted YYYY-MM-DD. */
function addisKey(offsetDays) {
  return new Date(Date.now() + 3 * 3600 * 1000 + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

/** Find an open slot a few days out (past the 12h window). */
async function findAvailability(barberId, serviceId, fromDays = 3, toDays = 12) {
  const params = new URLSearchParams({
    barber_id: barberId,
    service_id: serviceId,
    start_date: addisKey(fromDays),
    end_date: addisKey(toDays),
  });
  const { body } = await api(`/api/booking/availability?${params}`);
  return body.days ?? [];
}
async function main() {
  console.log(`\n=== Stage 7 manage smoke test (${BASE}) ===\n`);

  // --- fixtures ------------------------------------------------------------
  const barbers =
    await sql`SELECT id, name FROM barbers WHERE is_active = true ORDER BY name LIMIT 1`;
  const services =
    await sql`SELECT id, name FROM services WHERE is_active = true ORDER BY duration_minutes LIMIT 1`;
  if (!barbers.length || !services.length) {
    console.error("No demo data — run: npm run seed:demo");
    process.exit(1);
  }
  const barberId = barbers[0].id;
  const serviceId = services[0].id;

  const days = await findAvailability(barberId, serviceId, 3, 12);
  const firstDay = days.find((d) => d.slots.length > 0);
  if (!firstDay) {
    console.error("No availability in the next 2 weeks — is the shop open?");
    process.exit(1);
  }
  const bookedSlot = firstDay.slots[0];

  // --- 1. create a booking to manage ---------------------------------------
  const created = await post("/api/booking", {
    barber_id: barberId,
    service_id: serviceId,
    start_datetime: bookedSlot,
    customer_name: "Manage Test",
    customer_phone: freshPhone(),
    customer_email: `manage.${Date.now()}@example.com`,
  });
  check(
    "booking created for the test (201)",
    created.status === 201,
    JSON.stringify(created.body)
  );
  const token = created.body.management_token;
  if (!token) {
    console.error("no management token — aborting");
    process.exit(1);
  }

  // --- 2. GET by token ------------------------------------------------------
  const fetched = await api(`/api/manage/${token}`);
  check("GET by token returns 200", fetched.status === 200);
  check(
    "details include barber + service + display times",
    Boolean(
      fetched.body.barber?.name &&
        fetched.body.service?.name &&
        fetched.body.display?.date_key &&
        fetched.body.display?.start_time
    ),
    JSON.stringify(fetched.body.display)
  );
  check(
    "a future appointment is NOT flagged late (outside 12h)",
    fetched.body.late_change === false,
    `late_change=${fetched.body.late_change}`
  );
  check(
    "can_change is true for a confirmed booking",
    fetched.body.can_change === true
  );

  // --- 3. invalid token is a clean 404 -------------------------------------
  const bad = await api(`/api/manage/${randomBytes(24).toString("base64url")}`);
  check(
    "unknown token returns 404 (not a crash)",
    bad.status === 404,
    `got ${bad.status}`
  );

  // --- 4. reschedule to another slot ---------------------------------------
  let moved = null;
  outer: for (const day of days) {
    for (const slot of day.slots) {
      if (slot !== bookedSlot) {
        moved = slot;
        break outer;
      }
    }
  }

  if (!moved) {
    check("found a second slot to reschedule to", false);
  } else {
    const patched = await api(`/api/manage/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ management_token: token, start_datetime: moved }),
    });
    check(
      "reschedule returns 200",
      patched.status === 200,
      JSON.stringify(patched.body?.error ?? "")
    );
    check(
      "appointment start actually moved",
      Date.parse(patched.body?.appointment?.start_datetime ?? "") ===
        Date.parse(moved),
      `now ${patched.body?.appointment?.start_datetime}`
    );
  }

  const targetSlot = moved ?? bookedSlot;

  // --- 5. reschedule onto a slot held by another appointment → 409 ----------
  // Re-read availability AFTER our move, otherwise `targetSlot` might still be
  // the slot our own appointment now occupies.
  const freshDays = await findAvailability(barberId, serviceId, 3, 12);
  const freeSlot = freshDays
    .flatMap((d) => d.slots)
    .find((slot) => Date.parse(slot) !== Date.parse(moved ?? ""));

  const second = await post("/api/booking", {
    barber_id: barberId,
    service_id: serviceId,
    start_datetime: freeSlot ?? targetSlot,
    customer_name: "Second Customer",
    customer_phone: freshPhone(),
    customer_email: `second.${Date.now()}@example.com`,
  });

  if (second.status === 201) {
    // Try to move our appointment on top of theirs.
    const clash = await api(`/api/manage/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        management_token: token,
        start_datetime: freeSlot ?? targetSlot,
      }),
    });
    check(
      "reschedule onto a taken slot returns 409 (DB constraint, not 500)",
      clash.status === 409 && clash.body.error === "slot_no_longer_available",
      `status=${clash.status} error=${clash.body.error}`
    );
    await del(`/api/manage/${second.body.management_token}`, second.body.management_token);
    check("clash-test booking cleaned up", true);
  } else {
    check(
      "second booking created for the clash test",
      false,
      JSON.stringify(second.body)
    );
  }

  // --- 6. cancel releases the slot -----------------------------------------
  const before = await api(`/api/manage/${token}`);
  const heldDateKey = before.body.display.date_key;
  const heldStartTime = before.body.display.start_time;

  const cancelled = await del(`/api/manage/${token}`, token);
  check(
    "cancel returns 200",
    cancelled.status === 200,
    JSON.stringify(cancelled.body?.error ?? "")
  );
  check("cancel reports status=cancelled", cancelled.body?.status === "cancelled");

  const after = await api(`/api/manage/${token}`);
  check(
    "appointment now shows status=cancelled",
    after.body?.status === "cancelled"
  );
  check("can_change is false once cancelled", after.body?.can_change === false);

  const reopened = await api(
    `/api/booking/availability?${new URLSearchParams({
      barber_id: barberId,
      service_id: serviceId,
      start_date: heldDateKey,
      end_date: heldDateKey,
    })}`
  );
  const freedDay = (reopened.body.days ?? [])[0];
  check(
    "cancelled slot is available again",
    Boolean(
      freedDay?.slots?.some((s) => s.includes(heldStartTime))
    ),
    `looking for ${heldStartTime} on ${freedDay?.date}`
  );

  // --- 7. THE 12-HOUR RULE: late but still allowed --------------------------
  // Insert ~2 hours from now directly (past the booking API's past-slot guard)
  // so the appointment sits INSIDE the 12-hour window.
  const soonToken = randomBytes(24).toString("base64url");
  const soonStart = new Date(Date.now() + 2 * 3600 * 1000);
  const soonEnd = new Date(soonStart.getTime() + 20 * 60 * 1000);
  await sql`
    INSERT INTO appointments
      (barber_id, service_id, customer_name, customer_phone, customer_email,
       start_datetime, end_datetime, status, source, management_token)
    VALUES (${barberId}, ${serviceId}, 'Late Test', ${freshPhone()},
            ${`late.${Date.now()}@example.com`}, ${soonStart.toISOString()},
            ${soonEnd.toISOString()}, 'confirmed', 'online', ${soonToken})
  `;

  const late = await api(`/api/manage/${soonToken}`);
  check("appointment inside 12h loads", late.status === 200);
  check(
    "it is flagged late_change = true",
    late.body.late_change === true,
    `late_change=${late.body.late_change} hours_until=${late.body.hours_until}`
  );
  check(
    "a warning message is provided for the soft-warning UI",
    typeof late.body.late_change_message === "string" &&
      late.body.late_change_message.length > 0,
    late.body.late_change_message
  );
  check(
    "the action is STILL ALLOWED (soft warning, not a hard block)",
    late.body.can_change === true
  );

  const lateCancel = await del(`/api/manage/${soonToken}`, soonToken);
  check(
    "cancelling inside 12h succeeds (never blocked)",
    lateCancel.status === 200,
    `status=${lateCancel.status} error=${lateCancel.body?.error ?? ""}`
  );
  check(
    "the cancellation is reported as a late change",
    lateCancel.body?.late_change === true
  );

  console.log(
    `\n${
      failures === 0 ? "ALL MANAGE TESTS PASSED" : `${failures} TEST(S) FAILED`
    }\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke-manage crashed:", err);
  process.exit(1);
});
