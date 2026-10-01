"use client";

import { cn } from "@/lib/cn";

export interface StepDefinition {
  /** Short label shown under the number, e.g. "Service". */
  label: string;
  /** Longer accessible description, falls back to `label`. */
  description?: string;
}

export interface StepIndicatorProps {
  steps: StepDefinition[];
  /** Zero-based index of the step currently on screen. */
  current: number;
  /**
   * Highest step the user has legitimately reached. Steps at or below this
   * (but not the current one) are tappable so the customer can jump back to
   * review or change an earlier answer.
   */
  furthest: number;
  /** Jump to a previously-visited step. */
  onNavigate?: (index: number) => void;
}

/**
 * Horizontal, wrapping step indicator for the booking wizard.
 *
 * Reads as `1. Service → 2. Barber → …` with the current step highlighted, a
 * check mark on completed steps, and muted styling for steps not yet reached.
 * Completed steps are real buttons (keyboard reachable) so the flow is not a
 * one-way ratchet; the "connector" lines are decorative and hidden from AT.
 */
export function StepIndicator({
  steps,
  current,
  furthest,
  onNavigate,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const reachable = index <= furthest && index !== current;

          const marker = (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                active
                  ? "border-brass bg-brass text-charcoal"
                  : done
                    ? "border-brass/50 bg-brass/15 text-brass-strong"
                    : "border-line bg-surface text-cream-muted"
              )}
              aria-hidden="true"
            >
              {done ? "✓" : index + 1}
            </span>
          );

          const label = (
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider sm:text-[13px]",
                active
                  ? "text-cream"
                  : done
                    ? "text-cream-muted"
                    : "text-cream-muted/70"
              )}
            >
              {step.label}
            </span>
          );

          return (
            <li key={step.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1 hidden h-px w-4 sm:block",
                    index <= current ? "bg-brass/40" : "bg-line"
                  )}
                />
              )}
              {reachable && onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate(index)}
                  aria-current={undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
                    "hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2"
                  )}
                >
                  {marker}
                  <span className="sr-only">
                    Step {index + 1}:{" "}
                  </span>
                  {label}
                </button>
              ) : (
                <span
                  className="flex items-center gap-2 px-1.5 py-1"
                  aria-current={active ? "step" : undefined}
                >
                  {marker}
                  <span className="sr-only">Step {index + 1}: </span>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
