import { formatAddisTime, addisDateKey } from "@/lib/booking/time";
import { Badge, Button, Card } from "@/components/ui";

export interface BookingSummaryProps {
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  price: string;
  slotIso: string | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: () => void;
  submitLabel?: string;
}

/** Right-hand live summary card of the booking flow. */
export function BookingSummary({
  barberName,
  serviceName,
  durationMinutes,
  price,
  slotIso,
  submitting = false,
  error = null,
  onSubmit,
  submitLabel = "Confirm booking",
}: BookingSummaryProps) {
  return (
    <Card tone="raised" className="sticky top-20 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
        Your appointment
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-cream-muted">Barber</dt>
          <dd className="font-medium">{barberName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-cream-muted">Service</dt>
          <dd className="font-medium">{serviceName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-cream-muted">Duration</dt>
          <dd>{durationMinutes} min</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-3">
          <dt className="text-cream-muted">When</dt>
          <dd className="text-right">
            {slotIso ? (
              <>
                {addisDateKey(Date.parse(slotIso))}
                <br />
                {formatAddisTime(Date.parse(slotIso))} (Addis Ababa)
              </>
            ) : (
              <span className="text-cream-muted/60">Pick a time</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm text-cream-muted">Price</span>
        <span className="font-heading text-2xl font-semibold text-brass-strong">
          {price} Br
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <Button
        className="mt-5"
        size="lg"
        fullWidth
        loading={submitting}
        disabled={!slotIso}
        onClick={onSubmit}
      >
        {slotIso ? submitLabel : "Pick a time first"}
      </Button>

      <p className="mt-3 text-center text-xs leading-5 text-cream-muted/70">
        Free cancellation up to 12 hours before your appointment.
      </p>
    </Card>
  );
}
