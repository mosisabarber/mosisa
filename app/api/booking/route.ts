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
import { greetingName } from "@/lib/notifications/format";
import { buildIcs } from "@/lib/notifications/calendar";
import {
  addisDateKey,
  formatAddisTime,
  formatAddisTime12h,
} from "@/lib/booking/time";
import { notificationSiteUrl } from "@/lib/seo";

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
        // Email is optional — store NULL rather than an empty string.
        customerEmail: input.customer_email || null,
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
  // Links must point at the live domain (mosisabarber.com), never localhost.
  const siteUrl = notificationSiteUrl(request);
  const manageUrl = `${siteUrl}/manage/${managementToken}`;
  // Plain ASCII labels (Gregorian date key + English 12-hour Addis clock):
  // no Amharic, so every SMS stays GSM-7 — one segment at ≤150 chars instead
  // of three UCS-2 segments.
  const whenDate = addisDateKey(startMs);
  const whenStart = formatAddisTime12h(formatAddisTime(startMs));
  const whenEnd = formatAddisTime12h(formatAddisTime(endDatetime.getTime()));

  const ics = buildIcs({
    uid: `${appointmentId}@mosisa-barber-shop`,
    startIso: startDatetime.toISOString(),
    endIso: endDatetime.toISOString(),
    summary: `Appointment - ${service.name} with ${barber.name}`,
    description: `Your appointment at Mosisa Barber Shop.\nManage: ${manageUrl}`,
    location: "Mosisa Barber Shop, Harar",
    });

  // Greeting uses the first word the customer typed ("Dear Dawit").
  const dearName = greetingName(input.customer_name);

  // Email is optional — only attempt delivery when an address was given.
  if (input.customer_email) {
    const emailResult = await sendEmail(
      input.customer_email,
      `Your booking - ${service.name} with ${barber.name}`,
      `<p>Dear ${dearName},</p>
     <p>You are booking <strong>${service.name}</strong> with ${barber.name}.</p>
     <p>Your appointment is confirmed:<br/>
     ${whenDate} at ${whenStart}-${whenEnd} (Harar)</p>
     <p><a href="${manageUrl}">Manage your appointment</a> (view, reschedule, cancel)</p>
     <p><a href="data:text/calendar;base64,${Buffer.from(ics).toString("base64")}">Add to calendar (.ics)</a></p>`
    );
    if (!emailResult.success) {
      console.error("[booking] email notification failed:", emailResult.error);
    }
  }

  // ≤150 chars keeps the SMS one GSM-7 segment. Unusually long service or
  // barber names would push the full wording over, so fall back to a compact
  // form that still greets the customer and keeps the manage link intact.
  let smsText = `Dear ${dearName}, you are booking ${service.name} with ${barber.name} on ${whenDate} at ${whenStart}. Manage: ${manageUrl}`;
  if (smsText.length > 150) {
    smsText = `Dear ${dearName}, booking confirmed for ${whenDate} at ${whenStart}. Manage: ${manageUrl}`;
  }
  const smsResult = await sendSMS(input.customer_phone, smsText);
  if (!smsResult.success) {
    console.error("[booking] sms notification failed:", smsResult.error);
  }

  // 6 — response
  return NextResponse.json(
    { appointment_id: appointmentId, management_token: managementToken },
    { status: 201 }
  );
}
