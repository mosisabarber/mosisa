/**
 * Guest appointment management (AGENTS.md §6, §10).
 *
 *   GET    /api/manage/[token]  → appointment details + late-change status
 *   PATCH  /api/manage/[token]  → reschedule to a new slot
 *   DELETE /api/manage/[token]  → cancel
 *
 * Policy: changes are ALWAYS allowed, even inside the 12-hour window — a late
 * change is flagged (`late_change: true`) and surfaced as a soft warning in the
 * UI, never blocked (spec §4 / §10).
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, services } from "@/db/schema";
import { rescheduleInputSchema } from "@/lib/booking/validation";
import {
  cancelAppointmentByToken,
  getAppointmentByToken,
  isOpenForChanges,
} from "@/lib/booking/management";
import { classifyChange } from "@/lib/booking/lateness";
import { formatAddisTime, addisDateKey } from "@/lib/booking/time";
import { sendEmail } from "@/lib/notifications/email";
import { sendSMS } from "@/lib/notifications/sms";

const SIXTY_DAYS_MS = 60 * 24 * 3600 * 1000;

type LoadedAppointment = NonNullable<
  Awaited<ReturnType<typeof getAppointmentByToken>>
>;

/** Shape one appointment for the client. */
function serialize(appointment: LoadedAppointment | null) {
  if (!appointment) return null;
  const startMs = appointment.startDatetime.getTime();
  const change = classifyChange(appointment.startDatetime);
  return {
    appointment_id: appointment.id,
    status: appointment.status,
    source: appointment.source,
    customer_name: appointment.customerName,
    customer_phone: appointment.customerPhone,
    customer_email: appointment.customerEmail,
    start_datetime: appointment.startDatetime.toISOString(),
    end_datetime: appointment.endDatetime.toISOString(),
    display: {
      date_key: addisDateKey(startMs),
      start_time: formatAddisTime(startMs),
      end_time: formatAddisTime(appointment.endDatetime.getTime()),
      timezone: "Africa/Addis_Ababa",
    },
    barber: appointment.barber,
    service: appointment.service,
    can_change: isOpenForChanges(appointment.status),
    late_change: change.isLate,
    late_change_message: change.message,
    hours_until: change.hoursUntil,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);
  if (!appointment) {
    return NextResponse.json(
      { error: "not_found", message: "This appointment link is not valid." },
      { status: 404 }
    );
  }
  return NextResponse.json(serialize(appointment));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rescheduleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  // Defense in depth: the body token must match the URL token.
  if (parsed.data.management_token !== token) {
    return NextResponse.json(
      { error: "token_mismatch", message: "This link is not valid." },
      { status: 403 }
    );
  }

  const appointment = await getAppointmentByToken(token);
  if (!appointment) {
    return NextResponse.json(
      { error: "not_found", message: "This appointment link is not valid." },
      { status: 404 }
    );
  }
  if (!isOpenForChanges(appointment.status)) {
    return NextResponse.json(
      {
        error: "not_open",
        message:
          appointment.status === "cancelled"
            ? "This appointment has been cancelled. Please book a new one."
            : "This appointment can no longer be changed.",
      },
      { status: 409 }
    );
  }

  const startMs = Date.parse(parsed.data.start_datetime);
  const nowMs = Date.now();
  if (startMs <= nowMs + 60000 || startMs > nowMs + SIXTY_DAYS_MS) {
    return NextResponse.json(
      {
        error: "invalid_slot",
        message: "That time is outside the bookable window.",
      },
      { status: 400 }
    );
  }

  // Duration is always recomputed server-side from the booked service.
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, appointment.service.id))
    .limit(1);
  if (!service) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const newStart = new Date(startMs);
  const newEnd = new Date(startMs + service.durationMinutes * 60 * 1000);
  const change = classifyChange(appointment.startDatetime);

  try {
    await db
      .update(appointments)
      .set({ startDatetime: newStart, endDatetime: newEnd })
      .where(
        and(
          eq(appointments.id, appointment.id),
          eq(appointments.status, "confirmed")
        )
      );
  } catch (error: unknown) {
    const code =
      (error as { code?: string })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23P01") {
      // The exclusion constraint rejected the move — someone else has it.
      return NextResponse.json(
        {
          error: "slot_no_longer_available",
          message:
            "Sorry — that slot was just taken. Please pick another time.",
        },
        { status: 409 }
      );
    }
    console.error("[manage] reschedule failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Fire-and-forget notification of the new time (never fails the request).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const manageUrl = `${siteUrl}/manage/${token}`;
  const newDateKey = addisDateKey(startMs);
  const newStartTime = formatAddisTime(startMs);

  void sendEmail(
    appointment.customerEmail,
    `Rescheduled - ${service.name} with ${appointment.barber.name}`,
    `<p>Hi ${appointment.customerName},</p>
     <p>Your appointment has been moved to:</p>
     <p><strong>${newDateKey} at ${newStartTime}</strong> (Addis Ababa) with ${appointment.barber.name}</p>
     <p><a href="${manageUrl}">Manage your appointment</a></p>`
  );
  void sendSMS(
    appointment.customerPhone,
    `Mosisa Barber Shop: moved to ${newDateKey} ${newStartTime}. Manage: ${manageUrl}`
  );

  const refreshed = await getAppointmentByToken(token);
  return NextResponse.json({
    ok: true,
    late_change: change.isLate,
    late_change_message: change.message,
    appointment: serialize(refreshed),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Optional body token check (defense in depth) — a body is not required.
  try {
    const raw = (await request.json()) as { management_token?: string };
    if (raw?.management_token && raw.management_token !== token) {
      return NextResponse.json(
        { error: "token_mismatch", message: "This link is not valid." },
        { status: 403 }
      );
    }
  } catch {
    // no body — fine
  }

  const appointment = await getAppointmentByToken(token);
  if (!appointment) {
    return NextResponse.json(
      { error: "not_found", message: "This appointment link is not valid." },
      { status: 404 }
    );
  }

  const result = await cancelAppointmentByToken(token);
  if (result === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (result === "not_open") {
    return NextResponse.json(
      {
        error: "not_open",
        message: "This appointment is already cancelled or completed.",
      },
      { status: 409 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const manageUrl = `${siteUrl}/manage/${token}`;
  const dateKey = addisDateKey(appointment.startDatetime.getTime());
  const startTime = formatAddisTime(appointment.startDatetime.getTime());
  const change = classifyChange(appointment.startDatetime);

  void sendEmail(
    appointment.customerEmail,
    `Cancelled - ${appointment.service.name}`,
    `<p>Hi ${appointment.customerName},</p>
     <p>Your appointment on <strong>${dateKey} at ${startTime}</strong> with ${appointment.barber.name} has been cancelled.</p>
     ${
       change.isLate
         ? "<p>This was a late cancellation (inside 12 hours). Thanks for letting us know.</p>"
         : ""
     }
     <p>Book again any time: <a href="${siteUrl}/book">${siteUrl}/book</a></p>`
  );
  void sendSMS(
    appointment.customerPhone,
    `Mosisa Barber Shop: your ${dateKey} ${startTime} appointment is cancelled. Book again: ${siteUrl}/book`
  );

  return NextResponse.json({
    ok: true,
    status: "cancelled",
    late_change: change.isLate,
    late_change_message: change.message,
  });
}