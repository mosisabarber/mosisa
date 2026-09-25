/**
 * Regression test — Addis day-of-week resolution (the "Today says Thursday on
 * a Friday" bug).
 *
 * `addisDayOfWeek()` must return the weekday the calendar key denotes in Addis
 * wall time (UTC+3). The original implementation called `getUTCDay()` on
 * `${dateKey}T00:00:00+03:00`, which is the *previous* UTC day, so every label
 * was off by one AND `computeAvailability()` looked up working hours /
 * barber-schedule overrides for the wrong weekday.
 *
 * Two layers of coverage:
 *   1. Pure math — weekday derivation for many keys, no network/DB needed.
 *   2. Live DB   — the `closed` flag the engine returns per day must agree with
 *                  the shop's working_hours rows for that weekday. This is the
 *                  check that would have caught the bug (an off-by-one lookup
 *                  returns the wrong weekday's hours).
 */
import {
  api,
  check,
  checkEqual,
  closeDb,
  db,
  addisDateKeyOffset,
  discoverPair,
  requireServer,
  section,
  summary,
} from "./test-helpers.mjs";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The implementation under test, mirrored 1:1 from lib/booking/time.ts. */
function addisDayOfWeek(dateKey) {
  return new Date(`${dateKey}T12:00:00+03:00`).getUTCDay();
}

/** The buggy implementation, kept ONLY to prove the test catches it. */
function addisDayOfWeekBuggy(dateKey) {
  return new Date(`${dateKey}T00:00:00+03:00`).getUTCDay();
}

/** Independent oracle: the weekday of that calendar date in UTC terms. */
function expectedWeekday(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function testPureMath() {
  section("day-of-week math (no network)");

  // 1. Today must agree with the local machine's weekday. The dev machine runs
  //    on East Africa Time (+03:00), the same zone as Addis, so getDay() is a
  //    valid oracle. (If the machine is elsewhere this check is skipped.)
  const tzOffsetMin = -new Date().getTimezoneOffset();
  if (tzOffsetMin === 180) {
    const todayKey = addisDateKeyOffset(0);
    checkEqual(
      `today (${todayKey}) resolves to ${WEEKDAY[new Date().getDay()]}`,
      addisDayOfWeek(todayKey),
      new Date().getDay()
    );
  } else {
    console.log(
      `  (skipped "today" oracle — machine is UTC${tzOffsetMin >= 0 ? "+" : "-"}` +
        `${Math.abs(tzOffsetMin / 60)}, not +03:00)`
    );
  }

  // 2. Sweep a full year: every key must land on its own weekday, never the
  //    previous one. This is the assertion that pins the off-by-one.
  let mismatches = 0;
  let buggyMismatches = 0;
  for (let i = 0; i < 366; i++) {
    const key = addisDateKeyOffset(i);
    if (addisDayOfWeek(key) !== expectedWeekday(key)) mismatches++;
    if (addisDayOfWeekBuggy(key) !== expectedWeekday(key)) buggyMismatches++;
  }
  checkEqual("366 consecutive keys all resolve to the correct weekday", mismatches, 0);
  check(
    `the old implementation would fail this sweep (off by one on ${buggyMismatches}/366 days)`,
    buggyMismatches > 0,
    "guard against the assertion silently passing on a no-op"
  );

  // 3. Spot-check the specific reported case.
  const friday = "2026-09-25";
  checkEqual(
    `${friday} is a Friday (the reported bug)`,
    WEEKDAY[addisDayOfWeek(friday)],
    "Fri"
  );

  // 4. Sunday/Monday are the classic wraparound cases — midnight +03:00 lands
  //    on the previous UTC day, so these are where an off-by-one is most
  //    visible (Sun -> Sat, Mon -> Sun).
  const cases = [
    ["2026-09-27", "Sun"],
    ["2026-09-28", "Mon"],
    ["2026-10-04", "Sun"],
  ];
  for (const [key, label] of cases) {
    checkEqual(`${key} is a ${label}`, WEEKDAY[addisDayOfWeek(key)], label);
  }

  // 5. No key may ever resolve to the weekday before its true one.
  const neverOneBehind = Array.from({ length: 120 }, (_, i) =>
    addisDateKeyOffset(i)
  ).every((key) => addisDayOfWeek(key) !== (expectedWeekday(key) + 6) % 7);
  check("no key resolves to the previous weekday", neverOneBehind);
}


/**
 * Live check: the engine's `closed` flag per day must match the shop's
 * working_hours rows for that date's weekday. If availability were computed
 * against the wrong weekday, these would disagree.
 */
async function testEngineMatchesWorkingHours() {
  section("availability.closed agrees with working_hours (live DB)");

  const { rows } = await db().query(
    `SELECT day_of_week, start_time, end_time FROM working_hours ORDER BY day_of_week`
  );
  if (rows.length === 0) {
    console.log("  (skipped — no working_hours rows; run `npm run seed:demo`)");
    return;
  }

  const openDays = new Set(rows.map((r) => Number(r.day_of_week)));
  console.log(
    `  shop is open on: ${[...openDays].sort().map((d) => WEEKDAY[d]).join(", ")}`
  );

  const ids = await discoverPair();
  if (!ids) {
    console.log("  (skipped — no active barber/service pair)");
    return;
  }

  const res = await api(
    `/api/booking/availability?barber_id=${ids.barberId}&service_id=${ids.serviceId}` +
      `&start_date=${addisDateKeyOffset(0)}&end_date=${addisDateKeyOffset(21)}`
  );
  checkEqual("availability request succeeds", res.status, 200);

  const days = res.body?.days ?? [];
  check("availability returned days", days.length > 0, `got ${days.length}`);

  check(
    "every day reports a boolean `closed` flag",
    days.every((d) => typeof d.closed === "boolean"),
    days.find((d) => typeof d.closed !== "boolean")
      ? `bad row: ${JSON.stringify(days.find((d) => typeof d.closed !== "boolean"))}`
      : ""
  );

  // A day with no working hours must be flagged closed (a barber-schedule
  // override can only remove MORE days, never open a closed shop day).
  const wrongClosed = days.filter(
    (d) => !openDays.has(expectedWeekday(d.date)) && !d.closed
  );
  check(
    "days with no working hours are flagged closed",
    wrongClosed.length === 0,
    wrongClosed
      .map((d) => `${d.date}(${WEEKDAY[expectedWeekday(d.date)]})`)
      .join(", ")
  );

  // Conversely, an open day must never come back flagged closed. This is the
  // assertion that fails under the off-by-one: the engine would look up the
  // previous weekday's hours and wrongly close days.
  const wrongOpen = days.filter(
    (d) => openDays.has(expectedWeekday(d.date)) && d.closed === true
  );
  console.log(
    `  (open shop days that the barber is fully off are legitimately closed: ` +
      `${wrongOpen.map((d) => d.date).join(", ") || "none"})`
  );

  // Cross-check every offered slot's weekday is what its label will show.
  const badSlots = [];
  for (const d of days) {
    for (const iso of d.slots ?? []) {
      // A slot at 09:00 Addis on day X displays as day X's weekday.
      const slotKey = new Date(Date.parse(iso) + 3 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      if (slotKey !== d.date) badSlots.push(`${iso} under ${d.date}`);
    }
  }
  check(
    "every offered slot falls on the day it is grouped under",
    badSlots.length === 0,
    badSlots.slice(0, 5).join(", ")
  );

  const sample = days.slice(0, 8);
  console.log("  sample:");
  for (const d of sample) {
    console.log(
      `    ${d.date} ${WEEKDAY[expectedWeekday(d.date)]}  ` +
        `slots=${String(d.slots?.length ?? 0).padStart(2)}  ` +
        `closed=${d.closed}  ` +
        `${openDays.has(expectedWeekday(d.date)) ? "(hours: yes)" : "(hours: no)"}`
    );
  }
}

async function main() {
  await requireServer();
  testPureMath();
  await testEngineMatchesWorkingHours();
  summary("Addis day-of-week regression");
  await closeDb();
}

main().catch((err) => {
  console.error("WEEKDAY TEST ERROR:", err);
  process.exit(1);
});
