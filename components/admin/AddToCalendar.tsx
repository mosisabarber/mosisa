/**
 * "Add to calendar" button for an appointment row on the dashboard. Uses the
 * existing buildIcs helper + icsDataUrl to offer a one-click .ics download,
 * exactly like the public confirmation modal (§6 / lib/notifications/calendar).
 */
import { AddToCalendarLink } from "@/components/admin/AddToCalendarLink";
import type { AppointmentList } from "@/lib/admin-data";

export function AddToCalendar({ appointment }: { appointment: AppointmentList }) {
  return <AddToCalendarLink appointment={appointment} />;
}
