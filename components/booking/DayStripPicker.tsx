"use client";

import { addisDayOfWeek } from "@/lib/booking/time";
import { cn } from "@/lib/cn";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
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

export interface DayStripPickerProps {
  days: string[]; // 'YYYY-MM-DD' Addis calendar dates (within the 60-day cap)
  slotsByDate: Record<string, string[]>;
  /** Dates the shop/barber is closed for (no working hours that weekday). */
  closedDates?: string[];
  value: string | null;
  onSelect: (dateKey: string) => void;
  disabled?: boolean;
  /** Today's Addis date key — used to label the first day "Today". */
  todayKey?: string;
}

/**
 * Day picker for the booking flow's date & time step.
 *
 * Renders a wrapping grid — all days of the current window are visible at once
 * with no horizontal scrolling on any viewport:
 *   2 columns on phones, 4 on tablets, 7 (a full week per row) on desktop.
 */
export function DayStripPicker({
  days,
  slotsByDate,
  closedDates = [],
  value,
  onSelect,
  disabled = false,
  todayKey,
}: DayStripPickerProps) {
  const closed = new Set(closedDates);
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7",
        disabled && "pointer-events-none opacity-50"
      )}
      role="listbox"
      aria-label="Choose a date"
    >
      {days.map((dateKey) => {
        const slots = slotsByDate[dateKey];
        const count = slots?.length;
        const isSelected = value === dateKey;
        // Distinguish the three empty states: unknown (still fetching),
        // closed for the day, and open-but-fully-booked. Only the last two
        // should look unavailable.
        const isLoadingDay = count === undefined;
        const isClosed = closed.has(dateKey);
        const soldOut = !isLoadingDay && !isClosed && count === 0;
        const unavailable = isClosed || soldOut;
        const dow = WEEKDAY[addisDayOfWeek(dateKey)];
        const dayNum = Number(dateKey.slice(8, 10));
        const month = MONTH[Number(dateKey.slice(5, 7)) - 1];
        const isToday = dateKey === todayKey;
        const stateLabel = isClosed
          ? "closed"
          : soldOut
            ? "fully booked"
            : undefined;

        return (
          <button
            key={dateKey}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-label={`${dow} ${dayNum} ${month}${
              stateLabel ? ` — ${stateLabel}` : ""
            }`}
            disabled={unavailable}
            onClick={() => onSelect(dateKey)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-2 transition-colors",
              isSelected
                ? "border-brass bg-brass/15 text-brass-strong"
                : "border-line bg-surface text-cream-muted hover:border-brass/40 hover:text-cream",
              unavailable && "cursor-not-allowed opacity-35 hover:border-line"
            )}
          >
            <span className="text-[11px] uppercase tracking-wide">
              {isToday ? "Today" : dow}
            </span>
            <span className="mt-0.5 font-heading text-lg font-semibold leading-none">
              {dayNum}
            </span>
            <span className="mt-0.5 text-[11px] text-cream-muted">
              {month}
            </span>
            <span
              className={cn(
                "mt-1 h-1.5 w-1.5 rounded-full",
                isLoadingDay
                  ? "bg-cream-muted/30"
                  : unavailable
                    ? "bg-transparent"
                    : isSelected
                      ? "bg-brass"
                      : "bg-success"
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
