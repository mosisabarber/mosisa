/**
 * Stage 9 — concurrency stress test (spec §3 acceptance, §16; "non-negotiable").
 *
 * The existing scripts/concurrency-test.mjs inserts through SQL one at a time,
 * which never produces a true race. This suite fires N *simultaneous* HTTP
 * POSTs at the IDENTICAL slot and requires:
 *
 *   - exactly one 201, N-1 responses of 409 slot_no_longer_available
 *   - zero 5xx (an exclusion violation must never surface as a crash)
 *   - exactly one confirmed DB row for that barber+slot afterwards
 *
 * It uses a scratch barber/service so repeated runs never collide with demo
 * data, and a far-future slot clear of the 1-minute lead time.
 */
import {
  api,
  BASE_URL,
  check,
  checkEqual,
  closeDb,
  db,
  requireServer,
  section,
  summary,
  uniqueTag,
} from "./test-helpers.mjs";

const DAY_MS = 24 * 3600 * 1000;

function dayKey(n) {
  return new Date(Date.now() + n * DAY_MS + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Fire `n` bookings for the same barber+slot at the same instant. */
function race(n, payload) {
  const bodies = Array.from({ length: n }, (_, i) =>
    JSON.stringify({
      ...payload,
      customer_name: `Race ${i}`,
      customer_phone: `0955${String(100000 + i).slice(-6)}`,
      customer_email: `race-${Date.now()}-${i}@example.com`,
    })
  );
  // All fetches are created in the same tick; Node puts them on the wire
  // back-to-back so the server handles them concurrently.
  return Promise.all(
    bodies.map((body) =>
      fetch(`${BASE_URL}/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(60000),
      })
        .then(async (res) => ({
          status: res.status,
          body: await res.json().catch(() => null),
        }))
        .catch((err) => ({ status: 0, body: null, error: String(err) }))
    )
  );
}

async function main() {
  await requireServer();
  section("concurrency — same-slot race");

  const pool = db();
  const tag = uniqueTag("race");

  let barberId = null;
  let serviceId = null;

  try {
    barberId = (
      await pool.query(
        `INSERT INTO barbers (name, slug, buffer_minutes, is_active, specialties)
         VALUES ($1, $2, 0, true, ARRAY[]::text[]) RETURNING id`,
        [`${tag} Barber`, tag]
      )
    ).rows[0].id;

    serviceId = (
      await pool.query(
        `INSERT INTO services (name, duration_minutes, price, is_active)
         VALUES ($1, 30, 150, true) RETURNING id`,
        [`${tag} Service`]
      )
    ).rows[0].id;

    // Deterministic hours for THIS barber only (barber_schedules overrides
    // shop-wide working_hours in availability.ts). The shared working_hours
    // table is never modified, so an interrupted run cannot corrupt demo data.
    await pool.query(
      `INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time, is_off)
       SELECT $1, d, '08:00', '20:00', false FROM generate_series(0,6) AS d`,
      [barberId]
    );

    const slot = `${dayKey(30)}T15:00:00+03:00`;
    const payload = { barber_id: barberId, service_id: serviceId, start_datetime: slot };

    for (const width of [8, 20]) {
      const results = await race(width, payload);
      const byStatus = {};
      for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      console.log(`  race width ${width}: ${JSON.stringify(byStatus)}`);

      checkEqual(`[width ${width}] exactly one booking won`, byStatus[201] ?? 0, 1);
      checkEqual(`[width ${width}] every loser got 409`, byStatus[409] ?? 0, width - 1);
      check(
        `[width ${width}] zero 5xx responses`,
        !Object.keys(byStatus).some((s) => Number(s) >= 500),
        JSON.stringify(byStatus)
      );
      check(
        `[width ${width}] every 409 names slot_no_longer_available`,
        results
          .filter((r) => r.status === 409)
          .every((r) => r.body?.error === "slot_no_longer_available")
      );
      check(
        `[width ${width}] the winner received a management token`,
        (results.find((r) => r.status === 201)?.body?.management_token ?? "").length >= 24
      );

      const dbRows = (
        await pool.query(
          `SELECT count(*)::int AS n FROM appointments
           WHERE barber_id = $1 AND start_datetime = $2 AND status = 'confirmed'`,
          [barberId, new Date(Date.parse(slot))]
        )
      ).rows[0].n;
      checkEqual(
        `[width ${width}] DB holds exactly one confirmed row for the slot`,
        dbRows,
        1
      );

      await pool.query(`DELETE FROM appointments WHERE barber_id = $1`, [barberId]);
    }

    // ---- sanity: different slots must NOT collide -------------------------
    const spread = await Promise.all(
      [0, 1, 2].map((i) =>
        api("/api/booking", {
          method: "POST",
          body: JSON.stringify({
            barber_id: barberId,
            service_id: serviceId,
            start_datetime: `${dayKey(31)}T${10 + i}:00:00+03:00`,
            customer_name: `Spread ${i}`,
            customer_phone: `09666${String(10000 + i).slice(-5)}`,
            customer_email: `spread-${i}-${Date.now()}@example.com`,
          }),
        })
      )
    );
    checkEqual(
      "three DIFFERENT slots all book independently",
      spread.filter((r) => r.status === 201).length,
      3
    );
  } catch (err) {
    check("concurrency suite completed without an unexpected error", false, String(err?.message ?? err));
  } finally {
    try {
      if (barberId) {
        await pool.query(`DELETE FROM appointments WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM barber_schedules WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM blocked_times WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM barbers WHERE id = $1`, [barberId]);
      }
      if (serviceId) await pool.query(`DELETE FROM services WHERE id = $1`, [serviceId]);
    } catch (err) {
      console.error("cleanup problem:", err?.message ?? err);
    }
  }

  summary("concurrency");
  await closeDb();
}

main().catch(async (err) => {
  console.error("CONCURRENCY TEST ERROR:", err);
  await closeDb().catch(() => {});
  process.exit(1);
});
