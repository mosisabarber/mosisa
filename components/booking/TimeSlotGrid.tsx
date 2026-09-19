"use client";

import { formatAddisTime } from "@/lib/booking/time";
import { cn } from "@/lib/cn";
import { Button, StateMessage } from "@/components/ui";

export interface TimeSlotGridProps {
  dateKey: string | null;
  slots: string[]; // ISO datetimes
  value: string | null;
  onSelect: (slotIso: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function TimeSlotGrid({
  dateKey,
  slots,
  value,
  onSelect,
  loading = false,
  error = null,
  onRetry,
}: TimeSlotGridProps) {
  if (!dateKey) {
    return (
      <StateMessage
        state="empty"
        title="Pick a date"
        description="Select a day above to see available times."
        className="py-8"
      />
    );
  }

  if (loading) {
    return <StateMessage state="loading" className="py-8" />;
  }

  if (error) {
    return (
      <StateMessage
        state="error"
        title="Could not load times"
        description={error}
        className="py-8"
        action={
          onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  if (slots.length === 0) {
    return (
      <StateMessage
        state="empty"
        title="Fully booked"
        description="No open times on this day — try another date."
        className="py-8"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
      {slots.map((slotIso) => {
        const isSelected = value === slotIso;
        return (
          <button
            key={slotIso}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${formatAddisTime(Date.parse(slotIso))} ${
              isSelected ? "selected" : "available"
            }`}
            onClick={() => onSelect(slotIso)}
            className={cn(
              "min-h-11 rounded-md border px-1 py-2.5 text-sm font-medium tabular-nums transition-colors",
              isSelected
                ? "border-brass bg-brass text-charcoal"
                : "border-line bg-surface text-cream hover:border-brass/50 hover:text-brass-strong"
            )}
          >
            {formatAddisTime(Date.parse(slotIso))}
          </button>
        );
      })}
    </div>
  );
}
