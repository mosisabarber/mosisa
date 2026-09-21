/**
 * Stage 9 — 60-day booking horizon (spec §4.6, §16 functional tests).
 *
 * Verifies the cap is enforced in BOTH places it must be:
 *   1. computeAvailability() — never OFFERS a slot beyond the horizon.
 *   2. POST /api/booking     — REJECTS a hand-crafted request beyond it.
 * A client that bypasses the UI must not be able to book month 3.
 */
import {
  api,
  check,
  checkEqual,
  closeDb,
  discoverPair,
  pickSlot,
  requireServer,
  section,
  summary,
} from "./test-helpers.mjs";

export const HORIZON_DAYS = 60;

/** Addis calendar date key for "today + n days". */
function dayKey(n) {
  const ms = Date.now() + n * 24 * 3600 * 1000 + 3 * 3600 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

async function main() {
  await requireServer();
  section("60-day booking horizon");

  // ---- need a real barber + service -------------------------------------
  const ids = await discoverPair();
  if (!ids) {
    console.error("No active barber/service pair found — run `npm run seed:demo` first.");
    process.exit(2);
  }
  const { barberId, serviceId } = ids;

  // ---- 1. availability must not offer anything past day 60 --------------
  const availRes = await api(
    `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}` +
      `&start_date=${dayKey(0)}&end_date=${dayKey(90)}`
  );
  checkEqual("availability request succeeds", availRes.status, 200);

  const days = availRes.body?.days ?? [];
  check("availability returned days", days.length > 0, `got ${days.length}`);

  const lastOffered = days.length ? days[days.length - 1].date : "";
  check(
    `no offered slot is beyond the 60-day horizon (last offered: ${lastOffered})`,
    lastOffered <= dayKey(HORIZON_DAYS),
    `expected <= ${dayKey(HORIZON_DAYS)}`
  );

  // The request asked for day 90; the engine must have clamped it.
  check(
    "day 90 was clamped out of the response",
    !days.some((d) => d.date > dayKey(HORIZON_DAYS))
  );

  const farDays = days.filter((d) => d.date >= dayKey(58));
  console.log(
    `  (days returned: ${days.length}; last few: ${days.slice(-3).map((d) => d.date).join(", ") || "none"})`
  );
  void farDays;

  // ---- 2. API must reject a hand-crafted far-future booking -------------
  // Build a slot on day 61 that would otherwise be a perfectly valid
  // working-hours time (09:00 Addis) — only the horizon should reject it.
  const beyond = `${dayKey(61)}T09:00:00+03:00`;
  const beyondRes = await api("/api/booking", {
    method: "POST",
    body: JSON.stringify({
      barber_id: barberId,
      service_id: serviceId,
      start_datetime: beyond,
      customer_name: "Horizon Test",
      customer_phone: "0911110001",
      customer_email: "horizon-test@example.com",
    }),
  });
  checkEqual("booking 61 days out is rejected", beyondRes.status, 400);
  checkEqual(
    "rejection names the bookable window",
    beyondRes.body?.error,
    "invalid_slot"
  );

  // Explicitly confirm the far boundary is NOT a 500.
  check("far-future rejection is a client error, not a crash", beyondRes.status < 500);

  // ---- 3. boundary: day 60 accepted, day 61 rejected --------------------
  const boundaryRes = await api(
    `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}` +
      `&start_date=${dayKey(59)}&end_date=${dayKey(61)}`
  );
  const boundaryDays = boundaryRes.body?.days ?? [];
  const day60 = boundaryDays.find((d) => d.date === dayKey(60));
  const day61 = boundaryDays.find((d) => d.date === dayKey(61));

  check("day 60 IS inside the horizon", day60 !== undefined);
  check("day 61 is NOT offered by the engine", day61 === undefined);

  // ---- 4. a slot well inside the horizon still books ---------------------
  const insideAvail = await api(
    `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}` +
      `&start_date=${dayKey(5)}&end_date=${dayKey(10)}`
  );
  const slot = pickSlot(insideAvail.body, 5);
  if (slot) {
    const okRes = await api("/api/booking", {
      method: "POST",
      body: JSON.stringify({
        barber_id: barberId,
        service_id: serviceId,
        start_datetime: slot.iso,
        customer_name: "Horizon Inside",
        customer_phone: "0911110002",
        customer_email: "horizon-inside@example.com",
      }),
    });
    checkEqual("a slot inside the horizon books successfully", okRes.status, 201);

    // cleanup
    if (okRes.body?.management_token) {
      await api(`/api/manage/${okRes.body.management_token}`, { method: "DELETE" });
    }
  } else {
    console.log("  (skipped inside-horizon booking — no free slot in days 5-10)");
  }

  summary("60-day horizon");
  await closeDb();
}

main().catch((err) => {
  console.error("HORIZON TEST ERROR:", err);
  process.exit(1);
});
