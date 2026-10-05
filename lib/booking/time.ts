/**
 * Time helpers — Africa/Addis_Ababa only (AGENTS.md §0: single hardcoded
 * timezone). Ethiopia uses UTC+3 year-round (no DST), so wall-clock math is
 * a fixed offset: shift an instant by +3h and read its UTC components.
 */

export const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;

/** "Now" as an instant, at minimum one minute of lead time for bookings. */
export function nowUtcMs(): number {
  return Date.now();
}

/** Shifted date whose UTC getters return Addis wall-clock components. */
function shifted(date: Date | number): Date {
  return new Date((typeof date === "number" ? date : date.getTime()) + ADDIS_OFFSET_MS);
}

/** 'YYYY-MM-DD' for the given instant, in Addis wall time. */
export function addisDateKey(instant: Date | number): string {
  return shifted(instant).toISOString().slice(0, 10);
}

/**
 * Day of week (0=Sunday .. 6=Saturday) for an Addis calendar date.
 *
 * Uses Addis *noon*, not midnight: `getUTCDay()` reads the UTC weekday of the
 * instant, and Addis midnight (+03:00) falls on the previous UTC day — so
 * `new Date('2026-09-25T00:00:00+03:00').getUTCDay()` is Thursday, not Friday.
 * Noon is safely inside the Addis day under any fixed offset, so the UTC
 * weekday always matches the Addis weekday the key denotes.
 */
export function addisDayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00+03:00`).getUTCDay();
}

/** UTC ms of Addis midnight for a 'YYYY-MM-DD' calendar date. */
export function addisDayStartUtcMs(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+03:00`);
}

/** 'HH:mm' for a UTC instant, in Addis wall time. */
export function formatAddisTime(utcMs: number): string {
  return shifted(utcMs).toISOString().slice(11, 16);
}

/**
 * Names used by `formatAddisDateLabel` when the caller supplies no localized
 * set (English defaults). Keep the array lengths: 7 weekdays, 12 months.
 */
export interface DateLabelNames {
  weekdaysShort: readonly string[];
  monthsShort: readonly string[];
  /**
   * Render the date in the Ethiopian (Ge'ez) calendar instead of the
   * Gregorian one — set for Amharic. Month names then come from
   * `ETHIOPIAN_MONTHS` and the year is the Ethiopian year.
   */
  ethiopian?: boolean;
}

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* --- Ethiopian (Ge'ez) calendar -------------------------------------------
 * Ethiopia keeps its own calendar: 13 months of 30 days plus ጳጉሜን (5 days,
 * 6 in a leap year), and years that run about 7.5 behind the Gregorian count.
 * Conversion goes through the Julian Day Number, which is exact — no
 * New-Year guessing and no dependence on the host clock.
 */

/** Ethiopian month names, index 0 = መስከረም … index 12 = ጳጉሜን. */
export const ETHIOPIAN_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
] as const;

/** Julian Day Number of 1 መስከረም 1 E.C. (the Amete Mihret epoch). */
const ETHIOPIAN_EPOCH_JDN = 1723856;

/** Julian Day Number of a proleptic-Gregorian calendar date. */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export interface EthiopianDate {
  year: number;
  /** 1..13 (13 = ጳጉሜን). */
  month: number;
  /** 1..30, or 1..5/6 for ጳጉሜን. */
  day: number;
}

/** Convert a 'YYYY-MM-DD' Addis date key to the Ethiopian calendar. */
export function toEthiopianDate(dateKey: string): EthiopianDate {
  const jdn = gregorianToJdn(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)),
    Number(dateKey.slice(8, 10))
  );
  const total = jdn - ETHIOPIAN_EPOCH_JDN;
  const cycle = Math.floor(total / 1461); // 4 Ethiopian years = 1461 days
  const remainder = total - 1461 * cycle;
  // The 4th year of each cycle is 366 days long; `remainder` 0..1460 maps onto
  // either that leap year or one of the three ordinary years (365 days each).
  const dayOfYear = (remainder % 365) + 365 * Math.floor(remainder / 1460);
  return {
    year:
      4 * cycle +
      Math.floor(remainder / 365) -
      Math.floor(remainder / 1460),
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
}

/**
 * Day number, month name and year for an Addis date key — in the Ethiopian
 * calendar when `names.ethiopian` is set, otherwise Gregorian.
 */
export function addisDateParts(
  dateKey: string,
  names?: DateLabelNames
): { day: string; month: string; year: string } {
  if (names?.ethiopian) {
    const { year, month, day } = toEthiopianDate(dateKey);
    return {
      day: String(day),
      month: ETHIOPIAN_MONTHS[month - 1] ?? "",
      year: String(year),
    };
  }
  const monthIndex = Number(dateKey.slice(5, 7)) - 1;
  return {
    day: String(Number(dateKey.slice(8, 10))),
    month: names
      ? (names.monthsShort[monthIndex] ?? "")
      : (MONTH_SHORT[monthIndex] ?? ""),
    year: dateKey.slice(0, 4),
  };
}

/**
 * Human label for an Addis calendar date key, e.g. 'Tue, 22 Sep 2026'.
 * Used by the booking flow's date/time step (better than a raw 'YYYY-MM-DD').
 * Pass `names` to render the label in the active locale (e.g. Amharic), which
 * renders 'እሁድ, 24 መስከረም 2019' for 2026-10-04 because Amharic uses the
 * Ethiopian calendar.
 */
export function formatAddisDateLabel(
  dateKey: string,
  names?: DateLabelNames
): string {
  const dowIndex = addisDayOfWeek(dateKey);
  const dow = names
    ? (names.weekdaysShort[dowIndex] ?? "")
    : (WEEKDAY_LONG[dowIndex] ?? "").slice(0, 3);
  const { day, month, year } = addisDateParts(dateKey, names);
  return `${dow}, ${day} ${month} ${year}`;
}

/** Build an ISO datetime string (with +03:00 offset) from date + 'HH:mm'. */
export function buildAddisIso(dateKey: string, hhmm: string): string {
  return `${dateKey}T${hhmm}:00+03:00`;
}

/** Parse a Postgres `time` value ('HH:mm:ss' or 'HH:mm') to ms-from-midnight. */
export function parseTimeOfDayMs(time: string): number {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return (h * 3600 + m * 60 + s) * 1000;
}

/**
 * Booking horizon per §4.6: at most 60 days out. Returns the exclusive UTC
 * upper bound (end of the 60th Addis day) and the date keys of the horizon.
 */
export function bookingHorizon() {
  const now = Date.now();
  const lastDayKey = addisDateKey(now + 60 * 24 * 3600 * 1000);
  return {
    horizonDays: 60,
    firstDateKey: addisDateKey(now),
    lastDateKey: lastDayKey,
    /** Exclusive upper bound: slots must start strictly before this. */
    capEndUtcMs: addisDayStartUtcMs(lastDayKey) + 24 * 3600 * 1000,
  };
}
