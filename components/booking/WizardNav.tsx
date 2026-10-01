"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export interface WizardNavProps {
  onBack?: () => void;
  onNext?: () => void;
  /** Hide Back on the first step. */
  showBack?: boolean;
  /** Label for the primary button (e.g. "Continue" / "Confirm booking"). */
  nextLabel: string;
  backLabel: string;
  /** Block the primary action until the step's requirement is met. */
  nextDisabled?: boolean;
  /** Show a spinner in the primary button and block double submits. */
  nextLoading?: boolean;
  /** Optional inline error (e.g. a submit failure) shown above the buttons. */
  error?: string | null;
  /** Extra node rendered on the left, e.g. a price preview. */
  aside?: ReactNode;
}

/**
 * Back / Continue footer shared by every wizard step. Keeps the primary action
 * disabled until the step is valid and prevents double submission while a
 * request is in flight.
 */
export function WizardNav({
  onBack,
  onNext,
  showBack = true,
  nextLabel,
  backLabel,
  nextDisabled = false,
  nextLoading = false,
  error = null,
  aside,
}: WizardNavProps) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      {error && (
        <p
          className="mb-3 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-9 text-sm text-cream-muted">{aside}</div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          {showBack && onBack && (
            <Button variant="secondary" onClick={onBack} disabled={nextLoading}>
              <span aria-hidden="true">←</span>
              {backLabel}
            </Button>
          )}
          {onNext && (
            <Button
              onClick={onNext}
              loading={nextLoading}
              disabled={nextDisabled || nextLoading}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
