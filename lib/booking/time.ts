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

/** Day of week (0=Sunday .. 6=Saturday) for an Addis calendar date. */
export function addisDayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00+03:00`).getUTCDay();
}

/** UTC ms of Addis midnight for a 'YYYY-MM-DD' calendar date. */
export function addisDayStartUtcMs(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+03:00`);
}

/** 'HH:mm' for a UTC instant, in Addis wall time. */
export function formatAddisTime(utcMs: number): string {
  return shifted(utcMs).toISOString().slice(11, 16);
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

/**
 * Human label for an Addis calendar date key, e.g. 'Tue, 22 Sep 2026'.
 * Used by the booking flow's date/time step (better than a raw 'YYYY-MM-DD').
 */
export function formatAddisDateLabel(dateKey: string): string {
  const dow = WEEKDAY_LONG[addisDayOfWeek(dateKey)] ?? "";
  const day = Number(dateKey.slice(8, 10));
  const month = MONTH_SHORT[Number(dateKey.slice(5, 7)) - 1] ?? "";
  const year = dateKey.slice(0, 4);
  return `${dow.slice(0, 3)}, ${day} ${month} ${year}`;
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
