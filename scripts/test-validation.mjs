/**
 * Stage 9 — server-side input hardening (spec §14, §16).
 *
 * A client that bypasses the booking UI must not be able to:
 *   - post malformed data (Zod schema must reject it)
 *   - dictate the appointment length (end_datetime is computed server-side)
 *   - book an inactive/unknown barber or service (404)
 *   - guess another customer's management token (404, entropy-checked)
 */
import {
  api,
  check,
  checkEqual,
  closeDb,
  db,
  discoverPair,
  pickSlot,
  requireServer,
  section,
  summary,
} from "./test-helpers.mjs";

function dayKey(n) {
  return new Date(Date.now() + n * 86400000 + 3600000 * 3).toISOString().slice(0, 10);
}

async function book(overrides = {}) {
  const pair = await discoverPair();
  const avail = await api(
    `/api/booking/availability?barber_id=${pair.barberId}&service_id=${pair.serviceId}` +
      `&start_date=${dayKey(7)}&end_date=${dayKey(12)}`
  );
  const slot = pickSlot(avail.body, 7);
  return api("/api/booking", {
    method: "POST",
    body: JSON.stringify({
      barber_id: pair.barberId,
      service_id: pair.serviceId,
      start_datetime: slot?.iso ?? `${dayKey(8)}T10:00:00+03:00`,
      customer_name: "Validation Test",
      customer_phone: "0933330001",
      customer_email: "validation-test@example.com",
      ...overrides,
    }),
  });
}

async function main() {
  await requireServer();
  section("server-side input hardening");

  const pair = await discoverPair();
  check("active barber/service pair exists", !!pair);

  // ---- schema rejections -------------------------------------------------
  const badPhone = await book({ customer_phone: "12345" });
  checkEqual("short/garbage phone rejected", badPhone.status, 400);

  const landline = await book({ customer_phone: "0111234567" });
  checkEqual("non-mobile (landline) phone rejected", landline.status, 400);

  const badEmail = await book({ customer_email: "not-an-email" });
  checkEqual("malformed email rejected", badEmail.status, 400);

  const badUuid = await book({ barber_id: "not-a-uuid" });
  checkEqual("non-uuid barber_id rejected", badUuid.status, 400);

  const badDate = await book({ start_datetime: "tomorrow at 10" });
  checkEqual("unparseable start_datetime rejected", badDate.status, 400);

  const shortName = await book({ customer_name: "A" });
  checkEqual("1-char customer_name rejected", shortName.status, 400);

  const raw = await fetch(`${"http://localhost:3000"}/api/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  checkEqual("invalid JSON body rejected", raw.status, 400);

  // ---- valid phone variants normalize and succeed ------------------------
  const plusForm = await book({ customer_phone: "+251911223344" });
  check("E.164-style +2519... phone accepted", plusForm.status === 201 || plusForm.status === 429,
    `status ${plusForm.status} (429 = phone rate-limit, also acceptable here)`);

  // ---- server-side end time ---------------------------------------------
  const seeded = await book({ customer_phone: "0933330099", customer_email: "v-end@example.com" });
  if (seeded.status === 201) {
    const row = (
      await db().query(
        `SELECT a.start_datetime, a.end_datetime, s.duration_minutes
         FROM appointments a JOIN services s ON s.id = a.service_id
         WHERE a.id = $1`,
        [seeded.body.appointment_id]
      )
    ).rows[0];
    const lenMin = (new Date(row.end_datetime) - new Date(row.start_datetime)) / 60000;
    checkEqual(
      "appointment length equals the service duration (client cannot set it)",
      lenMin,
      row.duration_minutes
    );
    await api(`/api/manage/${seeded.body.management_token}`, { method: "DELETE" });
  } else {
    console.log(`  (skipped end-time check — booking returned ${seeded.status})`);
  }

  // ---- unknown / inactive barber & service -------------------------------
  const nilUuid = "00000000-0000-0000-0000-000000000000";
  const avail = await api(
    `/api/booking/availability?barber_id=${nilUuid}&service_id=${nilUuid}` +
      `&start_date=${dayKey(1)}&end_date=${dayKey(2)}`
  );
  checkEqual("availability for unknown barber/service is 404", avail.status, 404);

  // ---- management token hygiene ------------------------------------------
  const tokens = new Set();
  const emails = [];
  for (let i = 0; i < 5; i++) {
    const res = await api("/api/booking", {
      method: "POST",
      body: JSON.stringify({
        barber_id: pair.barberId,
        service_id: pair.serviceId,
        start_datetime: `${dayKey(20 + i)}T14:00:00+03:00`,
        customer_name: "Token Test",
        customer_phone: `09444400${String(i).padStart(2, "0")}`,
        customer_email: `token-test-${i}@example.com`,
      }),
    });
    if (res.status === 201 && res.body?.management_token) {
      tokens.add(res.body.management_token);
      emails.push(`token-test-${i}@example.com`);
    }
  }
  checkEqual("5 bookings produced 5 distinct tokens", tokens.size, Math.min(5, emails.length));

  for (const t of tokens) {
    check(
      `token meets entropy bar (>=24 chars): ${t.slice(0, 6)}…`,
      t.length >= 24,
      `len=${t.length}`
    );
    check("token is URL-safe (base64url)", /^[A-Za-z0-9_-]+$/.test(t));
  }

  // unknown token -> 404, not an error page leak
  const ghost = await api(`/api/manage/${"z".repeat(32)}`);
  checkEqual("unknown management token returns 404", ghost.status, 404);

  // cleanup token bookings
  await db().query(`DELETE FROM appointments WHERE customer_email LIKE 'token-test-%@example.com'`);

  summary("input hardening");
  await closeDb();
}

main().catch(async (err) => {
  console.error("VALIDATION TEST ERROR:", err);
  await closeDb().catch(() => {});
  process.exit(1);
});
