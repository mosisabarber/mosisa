/**
 * Check for the admin appointment-range bounds in `lib/admin-ranges.ts`.
 * Run: npx tsx scripts/test-admin-ranges.mts
 */
import {
  addisDateKey,
  addisDayOfWeek,
  addisDayStartUtcMs,
} from "../lib/booking/time.js";
import {
  appointmentRangeBounds,
  parseAppointmentRange,
} from "../lib/admin-ranges.js";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label} → ${String(actual)}${ok ? "" : ` (expected ${String(expected)})`}`
  );
}

const DAY_MS = 24 * 3600 * 1000;
/** Addis midnight is 21:00 UTC on the previous calendar day. */
const ADDIS_MIDNIGHT_UTC_SUFFIX = "T21:00:00.000Z";

// ---- parsing -------------------------------------------------------------
check("parse today", parseAppointmentRange("today"), "today");
check("parse tomorrow", parseAppointmentRange("tomorrow"), "tomorrow");
check("parse dayAfter", parseAppointmentRange("dayAfter"), "dayAfter");
check("parse week", parseAppointmentRange("week"), "week");
check("parse all is not a range", parseAppointmentRange("all"), null);
check("parse empty (cleared by the filter form)", parseAppointmentRange(""), null);
check("parse undefined", parseAppointmentRange(undefined), null);
check("parse junk", parseAppointmentRange("yesterday"), null);

// ---- bounds: Wednesday 2026-10-07 (Addis) --------------------------------
const wed = Date.parse("2026-10-07T10:00:00+03:00");
check("wed is a Wednesday", addisDayOfWeek("2026-10-07"), 3);

const today = appointmentRangeBounds("today", wed);
check("today starts at Addis midnight", today.fromIso.endsWith(ADDIS_MIDNIGHT_UTC_SUFFIX), true);
check("today first day", addisDateKey(Date.parse(today.fromIso)), "2026-10-07");
check("today length", Date.parse(today.toIso) - Date.parse(today.fromIso), DAY_MS);
check(
  "today end is next Addis midnight",
  Date.parse(today.toIso) - addisDayStartUtcMs("2026-10-08"),
  0
);

const tomorrow = appointmentRangeBounds("tomorrow", wed);
check("tomorrow first day", addisDateKey(Date.parse(tomorrow.fromIso)), "2026-10-08");
check("tomorrow length", Date.parse(tomorrow.toIso) - Date.parse(tomorrow.fromIso), DAY_MS);

const dayAfter = appointmentRangeBounds("dayAfter", wed);
check("dayAfter first day", addisDateKey(Date.parse(dayAfter.fromIso)), "2026-10-09");
check("dayAfter length", Date.parse(dayAfter.toIso) - Date.parse(dayAfter.fromIso), DAY_MS);

const week = appointmentRangeBounds("week", wed);
check("week first day is Monday", addisDateKey(Date.parse(week.fromIso)), "2026-10-05");
check("week starts on a Monday", addisDayOfWeek("2026-10-05"), 1);
check("week length is 7 days", Date.parse(week.toIso) - Date.parse(week.fromIso), 7 * DAY_MS);
check("week end is the next Monday", addisDateKey(Date.parse(week.toIso)), "2026-10-12");
check(
  "week contains today",
  Date.parse(week.fromIso) <= wed && wed < Date.parse(week.toIso),
  true
);

// Sunday 2026-10-04: the Monday→Sunday week starts the previous Monday.
const sun = Date.parse("2026-10-04T12:00:00+03:00");
check("sun is a Sunday", addisDayOfWeek("2026-10-04"), 0);
const sunWeek = appointmentRangeBounds("week", sun);
check("sunday week first day", addisDateKey(Date.parse(sunWeek.fromIso)), "2026-09-28");
check(
  "sunday week contains sunday",
  Date.parse(sunWeek.fromIso) <= sun && sun < Date.parse(sunWeek.toIso),
  true
);

// ---- Addis vs UTC day boundary -------------------------------------------
const justAfterAddisMidnight = Date.parse("2026-10-07T00:30:00+03:00");
check(
  "00:30 Addis belongs to 2026-10-07",
  addisDateKey(Date.parse(appointmentRangeBounds("today", justAfterAddisMidnight).fromIso)),
  "2026-10-07"
);

const justBeforeAddisMidnight = Date.parse("2026-10-06T23:30:00+03:00");
check(
  "23:30 Addis still belongs to 2026-10-06",
  addisDateKey(Date.parse(appointmentRangeBounds("today", justBeforeAddisMidnight).fromIso)),
  "2026-10-06"
);

// The previous implementation used UTC midnight, which is 03:00 Addis.
check(
  "start is Addis midnight",
  Date.parse(appointmentRangeBounds("today", wed).fromIso),
  addisDayStartUtcMs("2026-10-07")
);
check(
  "start is not UTC midnight of that date",
  Date.parse(appointmentRangeBounds("today", wed).fromIso) !==
    Date.parse("2026-10-07T00:00:00.000Z"),
  true
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
