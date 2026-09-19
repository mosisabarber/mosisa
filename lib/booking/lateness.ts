/**
 * The 12-hour change window (AGENTS.md §6 / product spec §4 policy).
 *
 * Policy: cancelling or rescheduling is ALWAYS allowed online. Within 12 hours
 * of the appointment it is flagged as a *late change* — a soft warning shown to
 * the customer, never a hard block. This module is the single source of truth
 * so the API and the UI can never disagree about what counts as late.
 */

export const LATE_CHANGE_WINDOW_HOURS = 12;
export const LATE_CHANGE_WINDOW_MS =
  LATE_CHANGE_WINDOW_HOURS * 60 * 60 * 1000;

export interface ChangeWindow {
  /** True when the appointment starts in under 12 hours. */
  isLate: boolean;
  /** Whole hours until the appointment (can be <= 0 once it has started). */
  hoursUntil: number;
  /** True when the appointment start time has already passed. */
  hasStarted: boolean;
  /** Customer-facing copy for the warning banner (empty when not late). */
  message: string;
}

/**
 * Classify a change against the 12-hour rule.
 *
 * @param startDatetime appointment start (Date or ISO string)
 * @param now reference instant — defaults to now, injectable for tests
 */
export function classifyChange(
  startDatetime: Date | string,
  now: Date = new Date()
): ChangeWindow {
  const startMs = new Date(startDatetime).getTime();
  const nowMs = now.getTime();
  const msUntil = startMs - nowMs;
  const hoursUntil = Math.floor(msUntil / (60 * 60 * 1000));

  if (!Number.isFinite(startMs)) {
    return {
      isLate: false,
      hoursUntil: 0,
      hasStarted: false,
      message: "",
    };
  }

  const hasStarted = msUntil <= 0;
  const isLate = msUntil < LATE_CHANGE_WINDOW_MS;

  let message = "";
  if (hasStarted) {
    message =
      "This appointment has already started. You can still cancel it, but please call the shop so we know.";
  } else if (isLate) {
    const hours = Math.max(hoursUntil, 0);
    const minutes = Math.max(Math.floor((msUntil % (60 * 60 * 1000)) / 60000), 0);
    const remaining =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
    message = `This is a late change — your appointment starts in ${remaining}. It's still allowed, but please call the shop if you can.`;
  }

  return {
    isLate: isLate || hasStarted,
    hoursUntil,
    hasStarted,
    message,
  };
}