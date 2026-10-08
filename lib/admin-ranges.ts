/**
 * Staff-facing appointment range filter (AGENTS.md §6).
 *
 * Pure and client-safe on purpose: the admin dropdown only needs the value list
 * and the type, while the server pages resolve the actual Addis (UTC+3) bounds.
 */
import {
  addisDateKey,
  addisDayOfWeek,
  addisDayStartUtcMs,
} from "@/lib/booking/time";

const DAY_MS = 24 * 3600 * 1000;

export const APPOINTMENT_RANGES = [
  "today",
  "tomorrow",
  "dayAfter",
  "week",
] as const;

export type AppointmentRange = (typeof APPOINTMENT_RANGES)[number];

/** What the dropdown holds: a range, or the "All appointments" jump. */
export type AppointmentRangeOption = AppointmentRange | "all";

/** Narrow an untrusted `?range=` value; anything unknown means "no range". */
export function parseAppointmentRange(value?: string): AppointmentRange | null {
  return APPOINTMENT_RANGES.includes(value as AppointmentRange)
    ? (value as AppointmentRange)
    : null;
}

/**
 * First Addis day and length of a range. "week" is the Monday → Sunday week
 * containing today, so mid-week it includes days already past.
 */
function rangeWindow(
  range: AppointmentRange,
  now: number
): { firstKey: string; days: number } {
  const todayKey = addisDateKey(now);
  const todayStart = addisDayStartUtcMs(todayKey);

  if (range === "week") {
    // addisDayOfWeek is 0=Sunday..6=Saturday, so Monday sits (dow + 6) % 7
    // days back from today.
    const mondayStart = todayStart - ((addisDayOfWeek(todayKey) + 6) % 7) * DAY_MS;
    return { firstKey: addisDateKey(mondayStart), days: 7 };
  }

  const offset = range === "today" ? 0 : range === "tomorrow" ? 1 : 2;
  return { firstKey: addisDateKey(todayStart + offset * DAY_MS), days: 1 };
}

/**
 * Half-open Addis-midnight bounds for a range: `[fromIso, toIso)`. Feed
 * straight into `getAppointments({ dateFrom, dateTo })`.
 */
export function appointmentRangeBounds(
  range: AppointmentRange,
  now: number = Date.now()
): { fromIso: string; toIso: string } {
  const { firstKey, days } = rangeWindow(range, now);
  const fromMs = addisDayStartUtcMs(firstKey);
  return {
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(fromMs + days * DAY_MS).toISOString(),
  };
}
