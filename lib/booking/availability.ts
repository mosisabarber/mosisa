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

/** Why a time on a given day cannot be booked. */
export type TakenReason = "booked" | "blocked";

/** A non-bookable time, surfaced so the UI can show it struck through. */
export interface TakenSlot {
  /** 'HH:mm' in Addis wall time — same label the free slots use. */
  time: string;
  /**
   * `booked` = a confirmed appointment actually occupies this time.
   * `blocked` = no appointment here, but the barber's buffer or a blocked
   * time removes it. Shown as "Unavailable", never as "Booked" — labelling a
   * buffer gap as booked would be a lie.
   */
  reason: TakenReason;
}

export interface DayAvailability {
  date: string;
  slots: string[]; // ISO datetimes with +03:00 offset — bookable times ONLY
  /**
   * Times that exist within the day's working hours but cannot be booked,
   * so the picker can render them struck through instead of silently hiding
   * them. Excludes past times (they are simply not shown) and never overlaps
   * `slots`.
   */
  takenSlots: TakenSlot[];
  /**
   * True when the shop/barber has no working hours that weekday (or the barber
   * is off) — distinct from "open but fully booked", so the picker can label
   * a closed day instead of implying every slot was taken.
   */
  closed: boolean;
}

export interface AvailabilityResult {
  timezone: typeof TIMEZONE;
  days: DayAvailability[];
}

export interface AvailabilityOptions {
  /**
   * Appointment id to ignore when subtracting existing bookings. Used when
   * rescheduling: without this the customer's own appointment would block the
   * very slot they are trying to keep or shift slightly.
   */
  excludeAppointmentId?: string;
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
 * Walk a base interval at the service's duration granularity and collect the
 * instants that fall inside it. Mirrors the slot stepping in
 * `computeAvailability` exactly, which is why callers must pass the day's
 * *working-hours* intervals rather than a cut: the grid is phased off the
 * working-hours start, so stepping from a cut boundary would yield times that
 * never line up with the free slots.
 */
function timesWithin(iv: Interval, durationMs: number): number[] {
  const out: number[] = [];
  for (let s = iv.start; s + durationMs <= iv.end; s += durationMs) out.push(s);
  return out;
}

/**
 * Compute available slots per day. Returns null when the barber or service
 * does not exist / is inactive (the route maps this to 404).
 */
export async function computeAvailability(
  query: AvailabilityQuery,
  options: AvailabilityOptions = {}
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

  // When rescheduling, the customer's own appointment must not block itself.
  const ownAppointmentId = options.excludeAppointmentId;
  const busyAppointments = ownAppointmentId
    ? appointmentRows.filter((row) => row.id !== ownAppointmentId)
    : appointmentRows;

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
      // Closed day: no working hours at all, so there is nothing to strike
      // through either — the picker labels the whole day as closed.
      days.push({ date: dateKey, slots: [], takenSlots: [], closed: true });
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
    const appointmentCuts: Interval[] = busyAppointments
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

    /**
     * True when a real confirmed appointment occupies this time. Used to tell
     * "Booked" apart from "Unavailable": a time removed only by the barber's
     * buffer or a blocked time has no appointment in it, so calling it booked
     * would be wrong.
     */
    const overlapsAppointments = (start: number) =>
      busyAppointments.some(
        (row) =>
          row.startDatetime.getTime() < start + durationMs &&
          row.endDatetime.getTime() > start
      );

    // Rule 5: duration granularity; Rule 7: no slots in the past
    //
    // The grid is generated from `dayBase` (working hours) so it keeps a stable
    // phase, e.g. 09:00, 09:40, 10:20 with a 40-min service. Generating from the
    // post-subtraction `free` intervals instead would re-phase the grid off each
    // cut boundary (a 10-min buffer would shift every later slot to 09:50,
    // 10:30, …) — that produced bogus times and hid genuinely free ones.
    const gridTimes: number[] = [];
    for (const iv of dayBase) {
      for (const s of timesWithin(iv, durationMs)) gridTimes.push(s);
    }
    // Deduplicate and sort (overlapping working-hour rows can repeat times).
    const uniqueGrid = [...new Set(gridTimes)].sort((a, b) => a - b);

    /** A grid time is bookable when its whole duration fits inside `free`. */
    const isFree = (start: number) =>
      free.some((iv) => start >= iv.start && start + durationMs <= iv.end);

    const slots: string[] = [];
    const takenSlots: TakenSlot[] = [];

    for (const s of uniqueGrid) {
      if (s <= nowUtcMs) continue; // past (Addis now) — rule 7

      if (isFree(s)) {
        slots.push(buildAddisIso(dateKey, formatAddisTime(s)));
        continue;
      }

      // Not bookable: report it so the UI can strike it through. `booked` only
      // when a real appointment occupies the time — a buffer gap or blocked
      // time reads as `blocked` rather than falsely claiming a booking.
      takenSlots.push({
        time: formatAddisTime(s),
        reason: overlapsAppointments(s) ? "booked" : "blocked",
      });
    }

    days.push({ date: dateKey, slots, takenSlots, closed: false });
  }

  return { timezone: TIMEZONE, days };
}

