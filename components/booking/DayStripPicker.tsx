"use client";

import { addisDayOfWeek } from "@/lib/booking/time";
import { cn } from "@/lib/cn";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface DayStripPickerProps {
  days: string[]; // 'YYYY-MM-DD' Addis calendar dates (within the 60-day cap)
  slotsByDate: Record<string, string[]>;
  value: string | null;
  onSelect: (dateKey: string) => void;
  disabled?: boolean;
}

/** Horizontal scrollable day-strip picker (spec §8). */
export function DayStripPicker({
  days,
  slotsByDate,
  value,
  onSelect,
  disabled = false,
}: DayStripPickerProps) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-2",
        disabled && "pointer-events-none opacity-50"
      )}
      role="listbox"
      aria-label="Choose a date"
    >
      {days.map((dateKey) => {
        const count = slotsByDate[dateKey]?.length;
        const isSelected = value === dateKey;
        const soldOut = count === 0;
        const dow = WEEKDAY[addisDayOfWeek(dateKey)];
        const dayNum = Number(dateKey.slice(8, 10));
        const month = [
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
        ][Number(dateKey.slice(5, 7)) - 1];

        return (
          <button
            key={dateKey}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={soldOut}
            onClick={() => onSelect(dateKey)}
            className={cn(
              "flex w-[68px] shrink-0 flex-col items-center rounded-lg border px-2 py-2.5 transition-colors",
              isSelected
                ? "border-brass bg-brass/15 text-brass-strong"
                : "border-line bg-surface text-cream-muted hover:border-brass/40 hover:text-cream",
              soldOut && "cursor-not-allowed opacity-35 hover:border-line"
            )}
          >
            <span className="text-[11px] uppercase tracking-widest">
              {dow}
            </span>
            <span className="mt-0.5 font-heading text-lg font-semibold leading-none">
              {dayNum}
            </span>
            <span className="text-[11px] text-cream-muted/70">{month}</span>
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 rounded-full",
                count === undefined
                  ? "bg-cream-muted/30"
                  : soldOut
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
