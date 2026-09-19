/**
 * Zod schemas for booking input (AGENTS.md §5) — every server-side write
 * validates input here, regardless of any client-side validation (§0).
 */
import { z } from "zod";

const isoDatetime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO datetime",
  });

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Expected YYYY-MM-DD",
});

/** Ethiopian mobiles: 09xxxxxxxx / 07xxxxxxxx, with +251/251/0 prefixes,
    spaces and dashes tolerated. Normalized to digits/+251 form. */
export const ethiopianPhone = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => /^(\+?251|0)?[97]\d{8}$/.test(v), {
    message: "Enter a valid Ethiopian phone number (e.g. 0912345678)",
  });

export const bookingInputSchema = z.object({
  barber_id: z.string().uuid(),
  service_id: z.string().uuid(),
  start_datetime: isoDatetime,
  customer_name: z.string().trim().min(2, "Name is too short").max(80),
  customer_phone: ethiopianPhone,
  customer_email: z.string().trim().toLowerCase().email().max(120),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** Reschedule: the token identifies the appointment; the new start is validated
    against the same horizon/past-slot guards as a fresh booking (§4 rules 6/7). */
export const rescheduleInputSchema = z.object({
  management_token: z.string().min(16).max(200),
  start_datetime: isoDatetime,
});

export type RescheduleInput = z.infer<typeof rescheduleInputSchema>;

export const availabilityQuerySchema = z
  .object({
    barber_id: z.string().uuid(),
    service_id: z.string().uuid(),
    start_date: calendarDate,
    end_date: calendarDate,
  })
  .refine(
    (v) => Date.parse(v.end_date) >= Date.parse(v.start_date),
    { message: "end_date must be on or after start_date" }
  );

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
