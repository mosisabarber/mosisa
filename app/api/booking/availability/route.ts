/**
 * GET /api/booking/availability (AGENTS.md §5)
 * Input: { barber_id, service_id, start_date, end_date } (all required)
 * Output: { timezone, days: [{ date, slots }] } — 404 if barber/service
 * unknown or inactive; 400 on invalid query.
 */
import { NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/booking/validation";
import { computeAvailability } from "@/lib/booking/availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    barber_id: url.searchParams.get("barber_id"),
    service_id: url.searchParams.get("service_id"),
    start_date: url.searchParams.get("start_date"),
    end_date: url.searchParams.get("end_date"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await computeAvailability(parsed.data);
  if (!result) {
    return NextResponse.json(
      { error: "not_found", message: "Unknown barber or service." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
