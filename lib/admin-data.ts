/**
 * Data access for the admin dashboard (AGENTS.md §8). Mirrors the defensive
 * `safe()` pattern in lib/data.ts so a missing/unseeded DB renders an empty
 * admin view instead of crashing the session-gated layout.
 */
import { asc, desc, eq, gt, lt, ilike, and, gte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appointments,
  barbers,
  services,
  workingHours,
  blockedTimes,
} from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Barber = InferSelectModel<typeof barbers>;
export type Service = InferSelectModel<typeof services>;
export type WorkingHour = InferSelectModel<typeof workingHours>;
export type BlockedTime = InferSelectModel<typeof blockedTimes>;
export type Appointment = InferSelectModel<typeof appointments>;

async function safe<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error("[admin-data] query failed, serving fallback:", error);
    return fallback;
  }
}

// ---- barbers -------------------------------------------------------------

export function getActiveBarbers(): Promise<Barber[]> {
  return safe(
    () => db.select().from(barbers).orderBy(asc(barbers.name)),
    []
  );
}

export function getBarberBySlug(slug: string): Promise<Barber | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(barbers)
      .where(eq(barbers.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}

// ---- services ------------------------------------------------------------

export function getActiveServices(): Promise<Service[]> {
  return safe(
    () =>
      db
        .select()
        .from(services)
        .where(eq(services.isActive, true))
        .orderBy(asc(services.name)),
    []
  );
}

export function getAllServices(): Promise<Service[]> {
  return safe(
    () => db.select().from(services).orderBy(asc(services.name)),
    []
  );
}

// ---- hours ---------------------------------------------------------------

export function getWorkingHours(): Promise<WorkingHour[]> {
  return safe(
    () =>
      db
        .select()
        .from(workingHours)
        .orderBy(asc(workingHours.dayOfWeek)),
    []
  );
}

// ---- blocked times -------------------------------------------------------

export function getBlockedTimes(limit = 100): Promise<BlockedTime[]> {
  return safe(
    () =>
      db
        .select()
        .from(blockedTimes)
        .orderBy(desc(blockedTimes.startDatetime))
        .limit(limit),
    []
  );
}

// ---- appointments --------------------------------------------------------

export interface AppointmentList {
  id: string;
  customerName: string;
  customerPhone: string;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
  barberName: string | null;
  serviceName: string | null;
}

/**
 * List + lightweight filtering for the dashboard. Date range and a free-text
 * search across customer names/phones. Returns the most recent first.
 */
export async function getAppointments(opts: {
  limit?: number;
  offset?: number;
  status?: "confirmed" | "cancelled" | "completed" | "no_show";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
} = {}): Promise<AppointmentList[]> {
  const { limit = 50, offset = 0, status, dateFrom, dateTo, search } = opts;

    // Strongly-typed condition array (avoids implicit any[] on `.where`).
  const conditions: Parameters<typeof and>[0][] = [];
  if (status) conditions.push(eq(appointments.status, status));
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!Number.isNaN(from.getTime()))
      conditions.push(gte(appointments.startDatetime, from));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!Number.isNaN(to.getTime()))
      conditions.push(lt(appointments.startDatetime, to));
  }
  if (search && search.trim()) {
    conditions.push(ilike(appointments.customerName, `%${search}%`));
  }

  // We don't expose customer_email on the list (PII hygiene for staff screens).
  return safe(
    () =>
      db
        .select({
          id: appointments.id,
          customerName: appointments.customerName,
          customerPhone: appointments.customerPhone,
          startDatetime: appointments.startDatetime,
          endDatetime: appointments.endDatetime,
          status: appointments.status,
          barberName: barbers.name,
          serviceName: services.name,
        })
        .from(appointments)
        .leftJoin(barbers, eq(appointments.barberId, barbers.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(appointments.startDatetime), desc(appointments.createdAt))
        .limit(limit)
        .offset(offset),
    []
  );
}

export function getTodaysAppointments(): Promise<AppointmentList[]> {
  return safe(async () => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    return getAppointments({ dateFrom: dayStart.toISOString(), dateTo: dayEnd.toISOString() });
  }, []);
}

export function getAppointmentById(id: string): Promise<Appointment | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}
