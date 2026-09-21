/**
 * POST /api/booking (AGENTS.md §5)
 *
 * Order of operations:
 *   1. Zod-validate input (never trust the client).
 *   2. Load barber + service server-side; compute end_datetime from the
 *      service duration — a client-supplied end time is never accepted.
 *   3. Rate-limit by phone + IP (clear, displayable errors — never silent).
 *   4. Insert; a 23P01 exclusion violation (double-booking race) maps to
 *      `slot_no_longer_available`, NOT a 500.
 *   5. Fire email/SMS via the §7 abstractions; failures never fail the
 *      booking (the confirmation modal is the customer's fallback).
 *   6. Respond { appointment_id, management_token }.
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";
import { bookingInputSchema } from "@/lib/booking/validation";
import { checkBookingRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notifications/email";
import { sendSMS } from "@/lib/notifications/sms";
import { buildIcs } from "@/lib/notifications/calendar";
import { formatAddisTime, addisDateKey } from "@/lib/booking/time";

function generateManagementToken(): string {
  return randomBytes(24).toString("base64url"); // crypto-random, not guessable
}

export async function POST(request: Request) {
  // 1 — validate
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 2 — load server-side facts
  const [barber] = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, input.barber_id), eq(barbers.isActive, true)))
    .limit(1);
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.service_id), eq(services.isActive, true)))
    .limit(1);

  if (!barber || !service) {
    return NextResponse.json(
      { error: "not_found", message: "Unknown barber or service." },
      { status: 404 }
    );
  }

  const startMs = Date.parse(input.start_datetime);
  const startDatetime = new Date(startMs);
  // end_datetime is computed server-side from the service duration — the
  // client never supplies it.
  const endDatetime = new Date(startMs + service.durationMinutes * 60 * 1000);

  // Horizon + past-slot guards (§4 rules 6/7 re-enforced server-side)
  const nowMs = Date.now();
  const SIXTY_DAYS_MS = 60 * 24 * 3600 * 1000;
  if (startMs <= nowMs + 60000 || startMs > nowMs + SIXTY_DAYS_MS) {
    return NextResponse.json(
      {
        error: "invalid_slot",
        message: "That time is outside the bookable window.",
      },
      { status: 400 }
    );
  }


  // 3 — rate limiting (before the insert, per §5/§8)
  const ip = clientIpFromRequest(request);
  const limit = await checkBookingRateLimit(input.customer_phone, ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        limit: limit.reason,
        message:
          limit.reason === "phone"
            ? "You just made a booking — please wait a minute before booking again."
            : "Too many booking attempts. Please try again later.",
        retry_after_seconds: limit.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  // 4 — insert; catch the exclusion-constraint violation
  const managementToken = generateManagementToken();
  let appointmentId: string;
  try {
    const [row] = await db
      .insert(appointments)
      .values({
        barberId: barber.id,
        serviceId: service.id,
        customerName: input.customer_name,
        customerPhone: input.customer_phone,
        customerEmail: input.customer_email,
        startDatetime,
        endDatetime,
        status: "confirmed",
        source: "online",
        managementToken,
      })
      .returning({ id: appointments.id });
    appointmentId = row.id;
  } catch (error: unknown) {
    const code =
      (error as { code?: string })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23P01") {
      return NextResponse.json(
        {
          error: "slot_no_longer_available",
          message:
            "Sorry — that slot was just taken. Please pick another time.",
        },
        { status: 409 }
      );
    }
    console.error("[booking] insert failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // 5 — notifications (fire-and-forget; failures never fail the booking)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const manageUrl = `${siteUrl}/manage/${managementToken}`;
  const startKey = addisDateKey(startMs);
  const startTime = formatAddisTime(startMs);
  const endTime = formatAddisTime(endDatetime.getTime());

  const ics = buildIcs({
    uid: `${appointmentId}@mosisa-barber-shop`,
    startIso: startDatetime.toISOString(),
    endIso: endDatetime.toISOString(),
    summary: `Appointment - ${service.name} with ${barber.name}`,
    description: `Your appointment at Mosisa Barber Shop.\nManage: ${manageUrl}`,
    location: "Mosisa Barber Shop, Harar",
    });

  const emailResult = await sendEmail(
    input.customer_email,
    `Your booking - ${service.name} with ${barber.name}`,
    `<p>Hi ${input.customer_name},</p>
     <p>Your appointment is confirmed:</p>
     <p><strong>${service.name}</strong> with ${barber.name}<br/>
     ${startKey} at ${startTime}-${endTime} (Harar)</p>
     <p><a href="${manageUrl}">Manage your appointment</a> (view, reschedule, cancel)</p>
     <p><a href="data:text/calendar;base64,${Buffer.from(ics).toString("base64")}">Add to calendar (.ics)</a></p>`
  );
  if (!emailResult.success) {
    console.error("[booking] email notification failed:", emailResult.error);
  }

  const smsResult = await sendSMS(
    input.customer_phone,
    `Mosisa Barber Shop: ${service.name} with ${barber.name} on ${startKey} ${startTime}. Manage: ${manageUrl}`
  );
  if (!smsResult.success) {
    console.error("[booking] sms notification failed:", smsResult.error);
  }

  // 6 — response
  return NextResponse.json(
    { appointment_id: appointmentId, management_token: managementToken },
    { status: 201 }
  );
}
