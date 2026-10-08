/**
 * Temporary check for the Ethiopian 6:00 clock in `lib/booking/time.ts`.
 * Run: npx tsx scripts/test-amharic-time.mts
 */
import {
  addisPeriodIndex,
  formatAddisDateLabel,
  formatAddisTimeLabel,
  formatAddisSlotLabel,
  formatHoursLabel,
  AMHARIC_PERIODS,
} from "../lib/booking/time.js";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${String(actual)}${ok ? "" : ` (expected ${String(expected)})`}`);
}

const AM = { ethiopian: true };

// Ethiopian clock boundaries: the day runs 6:00 → 6:00.
const table: [string, string][] = [
  ["00:00", "6:00 ሌሊት"],
  ["00:30", "6:30 ሌሊት"],
  ["05:59", "11:59 ሌሊት"],
  ["06:00", "12:00 ጠዋት"],
  ["06:59", "12:59 ጠዋት"],
  ["07:00", "1:00 ጠዋት"],
  ["09:00", "3:00 ጠዋት"],
  ["09:30", "3:30 ጠዋት"],
  ["11:59", "5:59 ጠዋት"],
  ["12:00", "6:00 ከሰዓት"],
  ["13:00", "7:00 ከሰዓት"],
  ["14:00", "8:00 ከሰዓት"],
  ["17:59", "11:59 ከሰዓት"],
  ["18:00", "12:00 ምሽት"],
  ["19:00", "1:00 ምሽት"],
  ["20:00", "2:00 ምሽት"],
  ["23:59", "5:59 ምሽት"],
];
for (const [hhmm, expected] of table) {
  check(`am  ${hhmm}`, formatAddisTimeLabel(hhmm, AM), expected);
}

// Postgres `time` values carry seconds.
check("am  09:00:00 (pg time)", formatAddisTimeLabel("09:00:00", AM), "3:00 ጠዋት");
check("am  20:00:00 (pg time)", formatHoursLabel("20:00:00", AM), "2:00 ምሽት");

// English must stay exactly as it was: 24-hour in booking, AM/PM in hours.
check("en  09:00 (booking)", formatAddisTimeLabel("09:00"), "09:00");
check("en  20:00 (booking)", formatAddisTimeLabel("20:00:00"), "20:00");
check("en  09:00 (hours)", formatHoursLabel("09:00"), "9:00 AM");
check("en  12:00 (hours)", formatHoursLabel("12:00"), "12:00 PM");
check("en  00:15 (hours)", formatHoursLabel("00:15"), "12:15 AM");
check("en  20:00 (hours)", formatHoursLabel("20:00"), "8:00 PM");

// Period bucketing.
check("period 05", addisPeriodIndex(5), 3);
check("period 06", addisPeriodIndex(6), 0);
check("period 11", addisPeriodIndex(11), 0);
check("period 12", addisPeriodIndex(12), 1);
check("period 17", addisPeriodIndex(17), 1);
check("period 18", addisPeriodIndex(18), 2);
check("period 23", addisPeriodIndex(23), 2);
console.log(`periods: ${AMHARIC_PERIODS.join(" · ")}`);

// Slot labels from a real ISO instant (Addis UTC+3).
check("am  slot 2026-10-04T09:30:00+03:00", formatAddisSlotLabel("2026-10-04T09:30:00+03:00", AM), "3:30 ጠዋት");
check("en  slot 2026-10-04T09:30:00+03:00", formatAddisSlotLabel("2026-10-04T09:30:00+03:00"), "09:30");

// Date side stays consistent: 2026-10-04 = 24 Meskerem 2019 (እሁድ).
const amNames = {
  weekdaysShort: ["እሁድ", "ሰኞ", "ማክሰ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"],
  monthsShort: ["ጃንዩ", "ፌብሩ", "ማርች", "ኤፕሪ", "ሜይ", "ጁን", "ጁላይ", "ኦገስ", "ሴፕቴ", "ኦክቶ", "ኖቬም", "ዲሴም"],
  ethiopian: true,
};
check("am  date 2026-10-04", formatAddisDateLabel("2026-10-04", amNames), "እሁድ, 24 መስከረም 2019");
check("en  date 2026-10-04", formatAddisDateLabel("2026-10-04"), "Sun, 4 Oct 2026");
check("en  date 2026-10-04 (latin names)", formatAddisDateLabel("2026-10-04", { weekdaysShort: ["Sun"], monthsShort: Array(12).fill("x") }), "Sun, 4 x 2026");

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
