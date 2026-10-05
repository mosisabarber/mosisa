import {
  formatAddisTime,
  addisDateKey,
  formatAddisDateLabel,
  type DateLabelNames,
} from "@/lib/booking/time";

export interface BookingSummaryProps {
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  price: string;
  slotIso: string | null;
  /** Customer name/phone/email — shown on the confirm step when provided. */
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  /** `true` renders the lighter, non-sticky card used on the confirm step. */
  embedded?: boolean;
  /** Optional second line under a row (e.g. a "Change" affordance). */
  onEditService?: () => void;
  onEditBarber?: () => void;
  onEditTime?: () => void;
  onEditDetails?: () => void;
  /** Note shown under the sidebar variant; localized by the booking flow. */
  cancellationNote?: string;
  /** Localized weekday/month names so the date label follows the locale. */
  dateNames?: DateLabelNames;
  labels?: {
    title: string;
    barber: string;
    service: string;
    duration: string;
    when: string;
    price: string;
    name: string;
    phone: string;
    email: string;
    change: string;
    pickTime: string;
    minutes: string;
    birr: string;
  };
}

const DEFAULT_LABELS = {
  title: "Your appointment",
  barber: "Barber",
  service: "Service",
  duration: "Duration",
  when: "When",
  price: "Price",
  name: "Name",
  phone: "Phone",
  email: "Email",
  change: "Change",
  pickTime: "Pick a time",
  minutes: "min",
  birr: "Br",
};

/**
 * Live summary of the booking. Rendered as a sticky sidebar card during the
 * wizard and, with `embedded`, as the full review card on the confirm step.
 */
export function BookingSummary({
  barberName,
  serviceName,
  durationMinutes,
  price,
  slotIso,
  customerName,
  customerPhone,
  customerEmail,
  embedded = false,
  onEditService,
  onEditBarber,
  onEditTime,
  onEditDetails,
  cancellationNote,
  dateNames,
  labels,
}: BookingSummaryProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const hasCustomer = customerName || customerPhone || customerEmail;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
        {l.title}
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <SummaryRow label={l.service} onEdit={onEditService} editLabel={l.change}>
          <span className="font-medium">{serviceName || "—"}</span>
        </SummaryRow>
        <SummaryRow label={l.barber} onEdit={onEditBarber} editLabel={l.change}>
          <span className="font-medium">{barberName || "—"}</span>
        </SummaryRow>
        <SummaryRow label={l.duration}>
          <span>
            {durationMinutes} {l.minutes}
          </span>
        </SummaryRow>
        <SummaryRow label={l.when} onEdit={onEditTime} editLabel={l.change}>
          {slotIso ? (
            <span className="text-right">
              {formatAddisDateLabel(addisDateKey(Date.parse(slotIso)), dateNames)}
              <br />
              {formatAddisTime(Date.parse(slotIso))} (Harar)
            </span>
          ) : (
            <span className="text-cream-muted">{l.pickTime}</span>
          )}
        </SummaryRow>

        {hasCustomer && (
          <div className="space-y-3 border-t border-line pt-3">
            {customerName && (
              <SummaryRow label={l.name} onEdit={onEditDetails} editLabel={l.change}>
                <span className="font-medium">{customerName}</span>
              </SummaryRow>
            )}
            {customerPhone && (
              <SummaryRow label={l.phone}>
                <span className="font-medium tabular-nums">{customerPhone}</span>
              </SummaryRow>
            )}
            {customerEmail && (
              <SummaryRow label={l.email}>
                <span className="break-all font-medium">{customerEmail}</span>
              </SummaryRow>
            )}
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm text-cream-muted">{l.price}</span>
        <span className="font-heading text-2xl font-semibold text-brass-strong">
          {price} {l.birr}
        </span>
      </div>

      {!embedded && cancellationNote && (
        <p className="mt-3 text-center text-xs leading-5 text-cream-muted">
          {cancellationNote}
        </p>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  children,
  onEdit,
  editLabel = "Change",
}: {
  label: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-cream-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        {children}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-cream-muted transition-colors hover:border-brass/40 hover:text-cream"
          >
            {editLabel}
          </button>
        )}
      </dd>
    </div>
  );
}

