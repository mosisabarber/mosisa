/**
 * Regression test — taken slots are reported, not silently dropped.
 *
 * The date/time picker now shows non-bookable times struck through. The engine
 * must therefore report them alongside the free ones, correctly classified:
 *
 *   booked  → a confirmed appointment actually occupies that time
 *   blocked → no appointment, but the barber's buffer or a blocked time removes it
 *
 * Invariants asserted here (these are what keep the UI honest):
 *   1. `slots` and `takenSlots` never overlap.
 *   2. No past time is ever reported as taken (past times stay hidden).
 *   3. The booked slot itself is `booked`, and its buffer neighbours are
 *      `blocked` — NOT `booked`. Labelling a buffer gap as booked would lie.
 *   4. Booking does not make previously-visible times vanish from the day.
 *   5. Rescheduling must not report the customer's own appointment as taken.
 */
import {
  api,
  addisDateKeyOffset,
  check,
  checkEqual,
  closeDb,
  discoverPair,
  requireServer,
  section,
  summary,
  uniqueTag,
} from "./test-helpers.mjs";

/** 'HH:mm' Addis wall time from an ISO datetime with +03:00 offset. */
function hhmm(iso) {
  return iso.slice(11, 16);
}

function dayFor(body, dateKey) {
  return (body?.days ?? []).find((d) => d.date === dateKey);
}

/** Pick a day that has at least `need` free slots, starting `minDaysOut`. */
function findDay(body, need, minDaysOut = 2) {
  const floor = addisDateKeyOffset(minDaysOut);
  return (body?.days ?? []).find(
    (d) => d.date >= floor && (d.slots?.length ?? 0) >= need
  );
}

async function availability(barberId, serviceId, from, to) {
  return api(
    `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}` +
      `&start_date=${from}&end_date=${to}`
  );
}


async function main() {
  await requireServer();
  section("taken slots (struck-through times)");

  const ids = await discoverPair();
  if (!ids) {
    console.error("No active barber/service pair — run `npm run seed:demo` first.");
    process.exit(2);
  }
  const { barberId, serviceId } = ids;

  const from = addisDateKeyOffset(0);
  const to = addisDateKeyOffset(20);

  // ---- shape of the response -------------------------------------------
  const before = await availability(barberId, serviceId, from, to);
  checkEqual("availability request succeeds", before.status, 200);

  const days = before.body?.days ?? [];
  check("availability returned days", days.length > 0, `got ${days.length}`);

  check(
    "every day includes a `takenSlots` array",
    days.every((d) => Array.isArray(d.takenSlots)),
    JSON.stringify(days.find((d) => !Array.isArray(d.takenSlots)) ?? null)
  );

  const malformed = days.flatMap((d) =>
    (d.takenSlots ?? []).filter(
      (t) =>
        typeof t?.time !== "string" ||
        !/^\d{2}:\d{2}$/.test(t.time) ||
        !["booked", "blocked"].includes(t?.reason)
    )
  );
  check(
    "every taken slot has { time: 'HH:mm', reason: 'booked'|'blocked' }",
    malformed.length === 0,
    JSON.stringify(malformed.slice(0, 5))
  );

  // ---- invariant 1: no overlap between free and taken -------------------
  const overlaps = [];
  for (const d of days) {
    const free = new Set((d.slots ?? []).map(hhmm));
    for (const t of d.takenSlots ?? []) {
      if (free.has(t.time)) overlaps.push(`${d.date} ${t.time}`);
    }
  }
  check(
    "no time is both bookable and taken",
    overlaps.length === 0,
    overlaps.slice(0, 5).join(", ")
  );

  // ---- invariant 2: never report the past ------------------------------
  const todayKey = addisDateKeyOffset(0);
  const nowHhmm = new Date(Date.now() + 3 * 3600 * 1000)
    .toISOString()
    .slice(11, 16);
  const pastTaken = [];
  for (const d of days) {
    for (const t of d.takenSlots ?? []) {
      if (d.date < todayKey) pastTaken.push(`${d.date} ${t.time} (past day)`);
      if (d.date === todayKey && t.time < nowHhmm) {
        pastTaken.push(`${d.date} ${t.time} (earlier today)`);
      }
    }
  }
  check(
    "no past time is reported as taken",
    pastTaken.length === 0,
    pastTaken.slice(0, 5).join(", ")
  );

  // ---- set up a real booking and inspect the classification -------------
  const target = findDay(before.body, 3);
  if (!target) {
    console.log("  (skipped booking assertions — no day with 3+ free slots)");
    summary("taken slots");
    await closeDb();
    return;
  }

  const beforeFree = new Set(target.slots.map(hhmm));
  const bookedIso = target.slots[0];
  const bookedTime = hhmm(bookedIso);
  console.log(`  target day ${target.date}: booking ${bookedTime}`);

  const tag = uniqueTag("taken");
  const created = await api("/api/booking", {
    method: "POST",
    body: JSON.stringify({
      barber_id: barberId,
      service_id: serviceId,
      start_datetime: bookedIso,
      customer_name: `Taken Test ${tag}`,
      customer_phone: `09${String(Date.now()).slice(-8)}`,
      customer_email: `taken-${tag}@example.com`,
    }),
  });
  checkEqual("the booking succeeds", created.status, 201);

  const token = created.body?.management_token;

  try {
    const after = await availability(barberId, serviceId, target.date, target.date);
    const dayAfter = dayFor(after.body, target.date);
    check("the day is still returned after booking", dayAfter !== undefined);

    const afterFree = new Set((dayAfter?.slots ?? []).map(hhmm));
    const takenMap = new Map(
      (dayAfter?.takenSlots ?? []).map((t) => [t.time, t.reason])
    );

    // ---- invariant 3: the booked time is reported, as `booked` ----------
    check(
      `the booked time ${bookedTime} is no longer offered as free`,
      !afterFree.has(bookedTime),
      `still in slots: ${[...afterFree].slice(0, 8).join(", ")}`
    );
    checkEqual(
      `the booked time ${bookedTime} is reported as taken`,
      takenMap.get(bookedTime),
      "booked"
    );

    // ---- invariant 1 again, after the write ----------------------------
    const postOverlap = [...afterFree].filter((t) => takenMap.has(t));
    check(
      "still no overlap between free and taken after booking",
      postOverlap.length === 0,
      postOverlap.join(", ")
    );

    console.log(
      `  taken on ${target.date}: ` +
        ((dayAfter?.takenSlots ?? [])
          .map((t) => `${t.time}:${t.reason}`)
          .join(", ") || "(none)")
    );

    // ---- buffer neighbours must NOT be labelled `booked` ---------------
    // A 30-min buffer around a booked slot removes neighbouring times too.
    // Those are buffer gaps, not bookings, so they must read `blocked`.
    const otherBooked = (dayAfter?.takenSlots ?? []).filter(
      (t) => t.reason === "booked" && t.time !== bookedTime
    );
    check(
      "only a real appointment is labelled `booked`",
      otherBooked.length === 0,
      otherBooked.map((t) => t.time).join(", ")
    );

    // ---- invariant 4: the day's shape is preserved ---------------------
    // Every time that was visible before must still be visible, either as
    // free or as taken — nothing should silently disappear from the grid.
    const coveredAfter = new Set([...afterFree, ...takenMap.keys()]);
    const lostFromView = [...beforeFree].filter((t) => !coveredAfter.has(t));
    check(
      "no previously-visible time silently disappeared",
      lostFromView.length === 0,
      lostFromView.slice(0, 6).join(", ")
    );

    // ---- invariant 5: reschedule must not flag the customer's own slot --
    const manageAvail = await api(
      `/api/manage/${token}?start_date=${target.date}&end_date=${target.date}`
    );
    if (manageAvail.status === 200) {
      const mDay = dayFor(manageAvail.body, target.date);
      const mTaken = new Set((mDay?.takenSlots ?? []).map((t) => t.time));
      check(
        "the customer's own appointment is not reported as taken to them",
        !mTaken.has(bookedTime),
        `own slot ${bookedTime} appeared as taken`
      );
    } else {
      console.log(
        `  (skipped reschedule check — manage availability returned ${manageAvail.status})`
      );
    }
  } finally {
    if (token) await api(`/api/manage/${token}`, { method: "DELETE" });
  }

  summary("taken slots");
  await closeDb();
}

main().catch((err) => {
  console.error("TAKEN-SLOTS TEST ERROR:", err);
  process.exit(1);
});

