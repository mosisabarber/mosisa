/**
 * Core slot calculation (AGENTS.md §4) — the ONLY place availability is
 * computed. Rules, in order:
 *   1. Start from working_hours for the requested day of week.
 *   2. Apply barber_schedules override (including is_off = removes the day).
 *   3. Subtract blocked_times overlapping that day (shop-wide or barber).
 *   4. Subtract confirmed appointments, expanded by the barber's buffer.
 *   5. Generate slots at the service's duration granularity.
 *   6. Reject/hide dates beyond 60 days (horizon clamp in lib/booking/time).
 *   7. Never return slots in the past (Africa/Addis_Ababa "now").
 */
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appointments,
  barbers,
  barberSchedules,
  blockedTimes,
  services,
  workingHours,
} from "@/db/schema";
import type { AvailabilityQuery } from "./validation";
import {
  addisDateKey,
  addisDayStartUtcMs,
  addisDayOfWeek,
  bookingHorizon,
  buildAddisIso,
  formatAddisTime,
  parseTimeOfDayMs,
} from "./time";

export const TIMEZONE = "Africa/Addis_Ababa";

export interface DayAvailability {
  date: string;
  slots: string[]; // ISO datetimes with +03:00 offset
}

export interface AvailabilityResult {
  timezone: typeof TIMEZONE;
  days: DayAvailability[];
}

interface Interval {
  start: number; // UTC ms
  end: number; // UTC ms, exclusive
}

/** Remove all `cuts` from `base` (interval arithmetic sweep). */
function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  let result = base;
  for (const cut of cuts) {
    const next: Interval[] = [];
    for (const iv of result) {
      if (cut.end <= iv.start || cut.start >= iv.end) {
        next.push(iv);
        continue;
      }
      if (cut.start > iv.start) {
        const head = { start: iv.start, end: Math.min(cut.start, iv.end) };
        if (head.end > head.start) next.push(head);
      }
      if (cut.end < iv.end) {
        const tail = { start: Math.max(cut.end, iv.start), end: iv.end };
        if (tail.end > tail.start) next.push(tail);
      }
    }
    result = next;
  }
  return result;
}

/**
 * Compute available slots per day. Returns null when the barber or service
 * does not exist / is inactive (the route maps this to 404).
 */
export async function computeAvailability(
  query: AvailabilityQuery
): Promise<AvailabilityResult | null> {
  const horizon = bookingHorizon();

  const [barberRow] = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, query.barber_id), eq(barbers.isActive, true)))
    .limit(1);
  if (!barberRow) return null;

  const [serviceRow] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, query.service_id), eq(services.isActive, true)))
    .limit(1);
  if (!serviceRow) return null;

  const durationMs = serviceRow.durationMinutes * 60 * 1000;
  const bufferMs = barberRow.bufferMinutes * 60 * 1000;

  // Clamp the requested range into the 60-day booking horizon (rule 6)
  const firstKey =
    query.start_date > horizon.firstDateKey
      ? query.start_date
      : horizon.firstDateKey;
  const lastKey =
    query.end_date < horizon.lastDateKey ? query.end_date : horizon.lastDateKey;
  if (firstKey > lastKey) return { timezone: TIMEZONE, days: [] };

  const rangeStartUtcMs = addisDayStartUtcMs(firstKey);
  const rangeEndUtcMs = addisDayStartUtcMs(lastKey) + 24 * 3600 * 1000;

  // --- day templates (rules 1–2) --------------------------------------------
  const hoursRows = await db.select().from(workingHours);
  const schedulesRows = await db
    .select()
    .from(barberSchedules)
    .where(eq(barberSchedules.barberId, barberRow.id));

  // --- cuts (rules 3–4), loaded once for the whole range --------------------
  const blockedRows = await db
    .select()
    .from(blockedTimes)
    .where(
      and(
        or(
          eq(blockedTimes.barberId, barberRow.id),
          isNull(blockedTimes.barberId)
        ),
        lt(blockedTimes.startDatetime, new Date(rangeEndUtcMs)),
        gt(blockedTimes.endDatetime, new Date(rangeStartUtcMs))
      )
    );

  const appointmentRows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberRow.id),
        eq(appointments.status, "confirmed"),
        lt(appointments.startDatetime, new Date(rangeEndUtcMs)),
        gt(appointments.endDatetime, new Date(rangeStartUtcMs))
      )
    );

  const nowUtcMs = Date.now();

  const days: DayAvailability[] = [];
  for (
    let t = addisDayStartUtcMs(firstKey);
    t < rangeEndUtcMs;
    t += 24 * 3600 * 1000
  ) {
    const dateKey = addisDateKey(t);
    const dow = addisDayOfWeek(dateKey);

    // Rule 1: shop-wide default hours
    const base: Interval[] = hoursRows
      .filter((row) => row.dayOfWeek === dow)
      .map((row) => ({
        start: t + parseTimeOfDayMs(row.startTime),
        end: t + parseTimeOfDayMs(row.endTime),
      }))
      .filter((iv) => iv.end > iv.start);

    // Rule 2: per-barber override
    const override = schedulesRows.find((row) => row.dayOfWeek === dow);
    let dayBase = base;
    if (override) {
      if (override.isOff) {
        dayBase = []; // day removed entirely
      } else if (override.startTime && override.endTime) {
        const start = t + parseTimeOfDayMs(override.startTime);
        const end = t + parseTimeOfDayMs(override.endTime);
        dayBase = end > start ? [{ start, end }] : [];
      }
    }

    if (dayBase.length === 0) {
      days.push({ date: dateKey, slots: [] }); // closed day
      continue;
    }

    // Rule 3: blocked times overlapping this day
    const blockedCuts: Interval[] = blockedRows
      .filter(
        (row) =>
          row.startDatetime.getTime() < t + 24 * 3600 * 1000 &&
          row.endDatetime.getTime() > t
      )
      .map((row) => ({
        start: row.startDatetime.getTime(),
        end: row.endDatetime.getTime(),
      }));

    // Rule 4: confirmed appointments expanded by the barber's buffer
    const appointmentCuts: Interval[] = appointmentRows
      .filter(
        (row) =>
          row.startDatetime.getTime() < t + 24 * 3600 * 1000 &&
          row.endDatetime.getTime() > t
      )
      .map((row) => ({
        start: row.startDatetime.getTime() - bufferMs,
        end: row.endDatetime.getTime() + bufferMs,
      }));

    const free = subtractIntervals(dayBase, [
      ...blockedCuts,
      ...appointmentCuts,
    ]);

    // Rule 5: duration granularity; Rule 7: no slots in the past
    const seen = new Set<number>();
    const slots: string[] = [];
    for (const iv of free) {
      for (let s = iv.start; s + durationMs <= iv.end; s += durationMs) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (s <= nowUtcMs) continue; // past (Addis now)
        slots.push(buildAddisIso(dateKey, formatAddisTime(s)));
      }
    }
    slots.sort();

    days.push({ date: dateKey, slots });
  }

  return { timezone: TIMEZONE, days };
}

