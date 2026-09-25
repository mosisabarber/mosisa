"use client";

import { formatAddisTime } from "@/lib/booking/time";
import { cn } from "@/lib/cn";
import { Button, StateMessage } from "@/components/ui";

export type TakenReason = "booked" | "blocked";

export interface TakenSlot {
  /** 'HH:mm' in Addis wall time. */
  time: string;
  reason: TakenReason;
}

export interface TimeSlotGridProps {
  dateKey: string | null;
  slots: string[]; // ISO datetimes
  /** Times inside working hours that cannot be booked, shown struck through. */
  takenSlots?: TakenSlot[];
  value: string | null;
  onSelect: (slotIso: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TAKEN_LABEL: Record<TakenReason, string> = {
  booked: "Booked",
  // `blocked` is the barber's turnaround/buffer gap or a blocked time — there
  // is no appointment here, so "Unavailable" would be vague and "Booked" wrong.
  blocked: "Buffer",
};

/** 'HH:mm' from an ISO slot, for merging with the taken list. */
function slotTime(iso: string): string {
  return iso.slice(11, 16);
}

export function TimeSlotGrid({
  dateKey,
  slots,
  takenSlots = [],
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

  // A day is only "empty" when there is nothing to show at all. If taken times
  // exist we still render the grid so the customer sees WHY nothing is free.
  if (slots.length === 0 && takenSlots.length === 0) {
    return (
      <StateMessage
        state="empty"
        title="Fully booked"
        description="No open times on this day — try another date."
        className="py-8"
      />
    );
  }

  // Merge free + taken into one chronological list so the day reads naturally
  // (e.g. 09:00, 09:30 Booked, 10:00).
  const freeByTime = new Map(slots.map((iso) => [slotTime(iso), iso]));
  const takenByTime = new Map(takenSlots.map((t) => [t.time, t.reason]));
  const allTimes = [...new Set([...freeByTime.keys(), ...takenByTime.keys()])].sort();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
        {allTimes.map((time) => {
        const slotIso = freeByTime.get(time);
        const reason = takenByTime.get(time);

        if (slotIso === undefined) {
          const label = TAKEN_LABEL[reason ?? "blocked"];
          return (
            <button
              key={time}
              type="button"
              disabled
              aria-disabled="true"
              aria-label={`${time} — ${label.toLowerCase()}`}
              title={label}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-md border px-1 py-2 text-sm font-medium tabular-nums",
                "cursor-not-allowed border-line/60 bg-surface/40 text-cream-muted/60"
              )}
            >
              <span className="line-through decoration-cream-muted/50">
                {time}
              </span>
              {/* Reason sits under the time so it reads at a glance, rather
                  than hiding in a tooltip. */}
              <span className="mt-0.5 text-[10px] font-normal uppercase leading-none tracking-wide text-cream-muted/70">
                {label}
              </span>
            </button>
          );
        }

        const isSelected = value === slotIso;
        return (
          <button
            key={time}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${time} ${isSelected ? "selected" : "available"}`}
            onClick={() => onSelect(slotIso)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-md border px-1 py-2 text-sm font-medium tabular-nums transition-colors",
              isSelected
                ? "border-brass bg-brass text-charcoal"
                : "border-line bg-surface text-cream hover:border-brass/50 hover:text-brass-strong"
            )}
          >
            <span>{formatAddisTime(Date.parse(slotIso))}</span>
            {/* Reserve the same label row so free and taken cells keep an
                identical height and the grid rows do not go ragged. */}
            <span
              className="mt-0.5 text-[10px] font-normal uppercase leading-none tracking-wide opacity-0"
              aria-hidden="true"
            >
              &nbsp;
            </span>
          </button>
        );
        })}
      </div>

      {takenSlots.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-cream-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-5 rounded-sm border border-line/60 bg-surface/40"
              aria-hidden="true"
            />
            Struck through = already taken
          </span>
          <span className="whitespace-nowrap">
            Booked = an appointment · Buffer = barber&rsquo;s turnaround
          </span>
        </p>
      )}
    </div>
  );
}
