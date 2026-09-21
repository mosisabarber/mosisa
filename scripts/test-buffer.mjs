/**
 * Stage 9 — per-barber buffer time (spec §16 functional tests, §3 schema).
 *
 * `barbers.buffer_minutes` must pad every existing appointment on BOTH sides
 * when computing availability: a 30-minute buffer around a 10:00–10:30 booking
 * hides 09:30–11:00. Slots immediately outside that window stay bookable.
 *
 * The test runs against a purpose-built scratch barber so it can set its own
 * buffer and working hours without disturbing seeded demo data.
 */
import {
  api,
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

function addisKey(offsetDays) {
  const ms = Date.now() + offsetDays * DAY_MS + 3 * 3600 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Addis 'HH:mm' for an instant. */
function addisHhmm(utcMs) {
  return new Date(utcMs + 3 * 3600 * 1000).toISOString().slice(11, 16);
}

async function availability(barberId, serviceId, fromDay, toDay) {
  const res = await api(
    `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}` +
      `&start_date=${addisKey(fromDay)}&end_date=${addisKey(toDay)}`
  );
  return res.body;
}

async function timesFor(barberId, serviceId, isoDay) {
  const body = await availability(barberId, serviceId, 14, 14);
  const day = body?.days?.find((d) => d.date === isoDay);
  return (day?.slots ?? []).map((s) => addisHhmm(Date.parse(s)));
}

async function main() {
  await requireServer();
  section("per-barber buffer time");

  const pool = db();
  const tag = uniqueTag("buffer");

  let barberId = null;
  let serviceId = null;

  try {
    barberId = (
      await pool.query(
        `INSERT INTO barbers (name, slug, buffer_minutes, is_active, specialties)
         VALUES ($1, $2, 30, true, ARRAY[]::text[]) RETURNING id`,
        [`${tag} Barber`, tag]
      )
    ).rows[0].id;

    serviceId = (
      await pool.query(
        `INSERT INTO services (name, duration_minutes, price, is_active)
         VALUES ($1, 30, 200, true) RETURNING id`,
        [`${tag} Service`]
      )
    ).rows[0].id;

    // Deterministic hours for THIS barber only: barber_schedules overrides
    // shop-wide working_hours inside availability.ts, so the shared table is
    // never modified (an interrupted run cannot corrupt real shop hours).
    await pool.query(
      `INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time, is_off)
       SELECT $1, d, '08:00', '20:00', false FROM generate_series(0,6) AS d`,
      [barberId]
    );

    const isoDay = addisKey(14); // fixed far day, well inside the horizon
    const dow = new Date(`${isoDay}T00:00:00+03:00`).getUTCDay();

    // ---- baseline: no appointments -> 08:00 is offered --------------------
    const baselineTimes = await timesFor(barberId, serviceId, isoDay);
    check("baseline day is present", baselineTimes.length > 0);
    check(
      "baseline offers the 08:00 opening slot",
      baselineTimes.includes("08:00"),
      `first slots: ${baselineTimes.slice(0, 4).join(", ")}`
    );
    const baselineCount = baselineTimes.length;

    // ---- book 10:00-10:30 with buffer 30 -> hide 09:30..11:00 -------------
    const startMs = Date.parse(`${isoDay}T10:00:00+03:00`);
    await pool.query(
      `INSERT INTO appointments
         (barber_id, service_id, customer_name, customer_phone, customer_email,
          start_datetime, end_datetime, status, source, management_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed','online',$8)`,
      [
        barberId,
        serviceId,
        "Buffer Test",
        "0922220001",
        "buffer-test@example.com",
        new Date(startMs),
        new Date(startMs + 30 * 60000),
        uniqueTag("tok"),
      ]
    );

    const afterTimes = await timesFor(barberId, serviceId, isoDay);
    check("the booked slot itself is gone", !afterTimes.includes("10:00"));
    check("slot inside pre-buffer (09:30) is hidden", !afterTimes.includes("09:30"));
    check("slot inside post-buffer (10:30) is hidden", !afterTimes.includes("10:30"));
    check(
      "slot just outside the buffer (11:00) is still offered",
      afterTimes.includes("11:00"),
      `present: ${afterTimes.slice(0, 12).join(", ")}`
    );
    check(
      "slot just before the buffer (09:00) is still offered",
      afterTimes.includes("09:00"),
      `present: ${afterTimes.slice(0, 12).join(", ")}`
    );
    checkEqual(
      "exactly 3 slots removed by a 30-min buffer",
      baselineCount - afterTimes.length,
      3
    );

    // ---- buffer = 0 -> only the appointment itself is blocked -------------
    await pool.query(`UPDATE barbers SET buffer_minutes = 0 WHERE id = $1`, [barberId]);
    const zeroTimes = await timesFor(barberId, serviceId, isoDay);
    check("buffer=0: booked slot still blocked", !zeroTimes.includes("10:00"));
    check("buffer=0: adjacent 09:30 slot returns", zeroTimes.includes("09:30"));
    check("buffer=0: adjacent 10:30 slot returns", zeroTimes.includes("10:30"));

    // ---- a larger buffer hides strictly more ------------------------------
    await pool.query(`UPDATE barbers SET buffer_minutes = 60 WHERE id = $1`, [barberId]);
    const bigTimes = await timesFor(barberId, serviceId, isoDay);
    check("60-min buffer: 09:30 hidden", !bigTimes.includes("09:30"));
    check("60-min buffer: 09:00 hidden", !bigTimes.includes("09:00"));
    check("60-min buffer: 11:00 hidden (inside cut)", !bigTimes.includes("11:00"));
    check(
      "60-min buffer: 11:30 still offered (cut boundary resumes cleanly)",
      bigTimes.includes("11:30"),
      `around 11: ${bigTimes.filter((t) => t.startsWith("11:")).join(", ")}`
    );
    check("60-min buffer: 12:00 still offered", bigTimes.includes("12:00"));
    check(
      "a 60-min buffer hides more slots than a 30-min buffer",
      bigTimes.length < afterTimes.length,
      `30min=${afterTimes.length}, 60min=${bigTimes.length}`
    );

    console.log(`  (fixtures: barber=${barberId} service=${serviceId} day=${isoDay} dow=${dow})`);
  } catch (err) {
    check("buffer suite completed without an unexpected error", false, String(err?.message ?? err));
  } finally {
    try {
      if (barberId) {
        await pool.query(`DELETE FROM appointments WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM barber_schedules WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM blocked_times WHERE barber_id = $1`, [barberId]);
        await pool.query(`DELETE FROM barbers WHERE id = $1`, [barberId]);
      }
      if (serviceId) {
        await pool.query(`DELETE FROM services WHERE id = $1`, [serviceId]);
      }
      // barber_schedules rows are removed by the barbers cascade above; the
      // shop-wide working_hours table is never touched by this suite.
    } catch (err) {
      console.error("cleanup problem:", err?.message ?? err);
    }
  }

  summary("buffer time");
  await closeDb();
}

main().catch(async (err) => {
  console.error("BUFFER TEST ERROR:", err);
  await closeDb().catch(() => {});
  process.exit(1);
});
