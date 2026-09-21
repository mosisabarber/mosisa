/**
 * Reusable .ics download link for a single appointment (dashboard row).
 */
"use client";

import { buildIcs, icsDataUrl } from "@/lib/notifications/calendar";
import type { AppointmentList } from "@/lib/admin-data";

export function AddToCalendarLink({ appointment }: { appointment: AppointmentList }) {
  const ics = buildIcs({
    uid: `${appointment.id}@mosisa-barber-shop`,
    startIso: appointment.startDatetime.toISOString(),
    endIso: appointment.endDatetime.toISOString(),
    summary: `${appointment.serviceName} — Mosisa Barber Shop`,
    description: `Appointment for ${appointment.customerName} with ${appointment.barberName ?? "a barber"}.`,
    location: "Mosisa Barber Shop, Harar",
  });

  return (
    <a
      href={icsDataUrl(ics)}
      download={`mosisa-${appointment.id}.ics`}
      className="text-xs font-medium text-brass-strong hover:underline"
    >
      .ics
    </a>
  );
}
