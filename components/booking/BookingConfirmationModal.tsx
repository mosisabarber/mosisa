"use client";

import { Button, Modal } from "@/components/ui";
import { formatAddisTime, addisDateKey } from "@/lib/booking/time";
import { buildIcs, icsDataUrl } from "@/lib/notifications/calendar";

export interface BookingConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  managementToken: string;
  barberName: string;
  serviceName: string;
  slotIso: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

/**
 * Compact confirmation modal immediately after booking (spec §8). Full
 * persistent details arrive via email + SMS; the manage link and the .ics
 * download are the fallback if a delivery fails.
 */
export function BookingConfirmationModal({
  open,
  onClose,
  appointmentId,
  managementToken,
  barberName,
  serviceName,
  slotIso,
  customerName,
}: BookingConfirmationModalProps) {
  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const manageHref = `${siteUrl}/manage/${managementToken}`;

  const ics = buildIcs({
    uid: `${appointmentId}@mosisa-barber-shop`,
    startIso: slotIso,
    endIso: new Date(Date.parse(slotIso) + 60 * 60 * 1000).toISOString(),
    summary: `Appointment — ${serviceName} with ${barberName}`,
    description: `Your appointment at Mosisa Barber Shop.\nManage: ${manageHref}`,
    location: "Mosisa Barber Shop, Harar",
  });

  return (
    <Modal open={open} onClose={onClose} title="Booking confirmed">
      <div className="text-center">
        <span className="font-heading text-4xl" aria-hidden="true">
          ✓
        </span>
        <p className="mt-2 text-sm leading-6 text-cream-muted">
          See you soon, {customerName.split(" ")[0]}.
        </p>
      </div>

      <div className="mt-4 rounded-md border border-line bg-surface p-4 text-sm">
        <p className="font-medium">{serviceName}</p>
        <p className="mt-0.5 text-cream-muted">with {barberName}</p>
        <p className="mt-2">
          {addisDateKey(Date.parse(slotIso))} ·{" "}
          {formatAddisTime(Date.parse(slotIso))}{" "}
          <span className="text-cream-muted">(Harar)</span>
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          onClick={() => {
            window.location.href = icsDataUrl(ics);
          }}
        >
          Add to Calendar
        </Button>
        <Button variant="secondary" onClick={() => window.location.assign(manageHref)}>
          Manage appointment
        </Button>
      </div>

      <p className="mt-3 text-center text-xs leading-5 text-cream-muted">
        Confirmation sent to your email and phone. If nothing arrives, use this
        link to manage your booking:{" "}
        <a href={manageHref} className="text-brass-strong underline">
          {manageHref}
        </a>
      </p>
    </Modal>
  );
}
