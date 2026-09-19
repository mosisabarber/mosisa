/**
 * .ics calendar generation (AGENTS.md §2 /lib/notifications/calendar.ts) —
 * used by the confirmation modal ("Add to Calendar") and, from Stage 6,
 * attachable/linkable in confirmation emails.
 */

function toIcsUtcBasic(iso: string): string {
  // 2026-09-25T09:00:00+03:00 → 20260925T060000Z
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface IcsEvent {
  uid: string;
  startIso: string;
  endIso: string;
  summary: string;
  description?: string;
  location?: string;
  createdAt?: Date;
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mosisa Barber Shop//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtcBasic((event.createdAt ?? new Date()).toISOString())}`,
    `DTSTART:${toIcsUtcBasic(event.startIso)}`,
    `DTEND:${toIcsUtcBasic(event.endIso)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    ...(event.description
      ? [`DESCRIPTION:${escapeIcsText(event.description)}`]
      : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Data URL so the confirmation modal can offer a one-click download. */
export function icsDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
