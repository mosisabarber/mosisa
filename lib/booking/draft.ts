/**
 * Resumable draft of the booking wizard, kept in `sessionStorage`.
 *
 * The wizard holds everything in component state, so anything that unmounts
 * it throws the booking away and drops the customer back to step 1 — most
 * visibly a language switch, where `/en/book` → `/am/book` is a different
 * `[lang]` route and React tears the page down (a reload or Back does the
 * same). The wizard mirrors its state here after every change (see
 * `BookingFlow`) and reads it back on its next mount, so the customer resumes
 * exactly where they left off, in either language.
 *
 * `sessionStorage` is per-tab: the draft dies with the tab, is never shared
 * with another session, and is deleted the moment a booking is confirmed —
 * an abandoned draft is also ignored after `MAX_AGE_MS`.
 */
import {
  addisDateKey,
  addisDayStartUtcMs,
  bookingHorizon,
} from "@/lib/booking/time";

const STORAGE_KEY = "mosisa.booking.draft";
const DRAFT_VERSION = 1;
/** Unfinished drafts older than this are never resumed. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

/** STEP.CONFIRM — keep in sync with the STEP map in BookingFlow. */
const LAST_STEP = 5;

export interface BookingDraft {
  serviceId: string | null;
  barberId: string | null;
  /** Step index (BookingFlow's STEP map), not a name — the wizard owns it. */
  step: number;
  furthestStep: number;
  /** Start of the 14-day availability window the customer was paging through. */
  windowStartMs: number | null;
  selectedDate: string | null;
  selectedSlot: string | null;
  name: string;
  phone: string;
  email: string;
}

interface StoredDraft extends BookingDraft {
  v: number;
  savedAt: number;
}

/** Persist the wizard's state. Never throws — a full or blocked storage just
    means the wizard won't resume, which must not break the booking itself. */
export function writeDraft(draft: BookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredDraft = { ...draft, v: DRAFT_VERSION, savedAt: Date.now() };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore — see doc comment
  }
}

/** Drop the draft (booking confirmed, or the customer restarted the flow). */
export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — a stale draft is bounded by MAX_AGE_MS anyway
  }
}

const asId = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null;

const asDateKey = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

const asText = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";

const asStep = (v: unknown): number =>
  typeof v === "number" && Number.isInteger(v)
    ? Math.min(LAST_STEP, Math.max(0, v))
    : 0;

/**
 * Read the saved draft for the next mount, or `null` when there is nothing
 * trustworthy to resume: no payload, a foreign/corrupt one, an expired one, a
 * day that has fallen outside the booking horizon, or a slot that no longer
 * belongs to the visible day.
 *
 * Time-dependent checks live here rather than in the wizard so that rendering
 * stays pure (no `Date.now()` during render) — the paging window is re-derived
 * from the chosen day, and a stale one is simply dropped for the wizard's
 * effect to reopen at "now".
 */
export function readDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: Partial<StoredDraft>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredDraft>;
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== DRAFT_VERSION) return null;
  if (
    typeof parsed.savedAt !== "number" ||
    !Number.isFinite(parsed.savedAt) ||
    Date.now() - parsed.savedAt > MAX_AGE_MS
  ) {
    return null;
  }

  const draft: BookingDraft = {
    serviceId: asId(parsed.serviceId),
    barberId: asId(parsed.barberId),
    step: asStep(parsed.step),
    furthestStep: asStep(parsed.furthestStep),
    windowStartMs:
      typeof parsed.windowStartMs === "number" &&
      Number.isFinite(parsed.windowStartMs)
        ? parsed.windowStartMs
        : null,
    selectedDate: asDateKey(parsed.selectedDate),
    selectedSlot: asText(parsed.selectedSlot, 40) || null,
    name: asText(parsed.name, 80),
    phone: asText(parsed.phone, 32),
    email: asText(parsed.email, 120),
  };
  draft.furthestStep = Math.max(draft.furthestStep, draft.step);

  // The day must still be bookable (today … +60 days, same horizon the server
  // enforces) and the slot must belong to it; otherwise drop back to "pick a
  // day" rather than restoring a selection the API would reject.
  const { firstDateKey, lastDateKey } = bookingHorizon();
  if (
    draft.selectedDate &&
    (draft.selectedDate < firstDateKey || draft.selectedDate > lastDateKey)
  ) {
    draft.selectedDate = null;
    draft.selectedSlot = null;
  } else if (
    draft.selectedSlot &&
    (!draft.selectedDate ||
      addisDateKey(Date.parse(draft.selectedSlot)) !== draft.selectedDate)
  ) {
    draft.selectedSlot = null;
  }

  // Re-anchor the window to the chosen day (the stored paging position may be
  // days old); with no day, leave it null so the wizard reopens at "now".
  draft.windowStartMs = draft.selectedDate
    ? addisDayStartUtcMs(draft.selectedDate)
    : null;

  return draft;
}
