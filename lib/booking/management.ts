/**
 * Guest appointment lookups by management token (AGENTS.md §6/§10).
 *
 * Tokens are crypto-random and non-guessable (§10 security). Every function
 * here takes the token as-is and returns null for unknown tokens — the route
 * layer maps that to a 404 without revealing whether the token *format* was
 * merely wrong.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";

export interface ManagedAppointment {
  id: string;
  status: string;
  source: string;
  startDatetime: Date;
  endDatetime: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: Date;
  barber: {
    id: string;
    name: string;
    slug: string;
    bufferMinutes: number;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
  };
}

/** Fetch one appointment (with barber + service) by its management token. */
export async function getAppointmentByToken(
  token: string
): Promise<ManagedAppointment | null> {
  if (!token || token.length < 16) return null; // obvious junk — skip the query

  const rows = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      source: appointments.source,
      startDatetime: appointments.startDatetime,
      endDatetime: appointments.endDatetime,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      customerEmail: appointments.customerEmail,
      createdAt: appointments.createdAt,
      barberId: barbers.id,
      barberName: barbers.name,
      barberSlug: barbers.slug,
      barberBufferMinutes: barbers.bufferMinutes,
      serviceId: services.id,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,
      servicePrice: services.price,
    })
    .from(appointments)
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.managementToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    source: row.source,
    startDatetime: row.startDatetime,
    endDatetime: row.endDatetime,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    createdAt: row.createdAt,
    barber: {
      id: row.barberId,
      name: row.barberName,
      slug: row.barberSlug,
      bufferMinutes: row.barberBufferMinutes,
    },
    service: {
      id: row.serviceId,
      name: row.serviceName,
      durationMinutes: row.serviceDurationMinutes,
      price: row.servicePrice,
    },
  };
}

/** True when the appointment can still be changed/cancelled (not already closed). */
export function isOpenForChanges(status: string): boolean {
  return status === "confirmed";
}

/** Cancel an appointment (soft cancel — keeps the row for shop history). */
export async function cancelAppointmentByToken(
  token: string
): Promise<"cancelled" | "not_found" | "not_open"> {
  const existing = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(eq(appointments.managementToken, token))
    .limit(1);

  const row = existing[0];
  if (!row) return "not_found";
  if (!isOpenForChanges(row.status)) return "not_open";

  await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(appointments.id, row.id),
        eq(appointments.status, "confirmed") // guard against a concurrent cancel
      )
    );

  return "cancelled";
}