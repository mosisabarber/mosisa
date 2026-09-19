/**
 * Data access for public pages (AGENTS.md Stage 4).
 *
 * Every query degrades gracefully: until the DATABASE_URL is live (or if the
 * DB is briefly unavailable) public pages render their empty state instead of
 * crashing. Once Stage 2's migration has been applied these return real rows.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers, services, workingHours } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Barber = InferSelectModel<typeof barbers>;
export type Service = InferSelectModel<typeof services>;
export type WorkingHour = InferSelectModel<typeof workingHours>;

async function safe<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    // Expected until `npm run db:migrate` has been run against Neon.
    console.error("[data] query failed, serving fallback:", error);
    return fallback;
  }
}

export function getActiveBarbers(): Promise<Barber[]> {
  return safe(
    () =>
      db
        .select()
        .from(barbers)
        .where(eq(barbers.isActive, true))
        .orderBy(asc(barbers.name)),
    []
  );
}

export function getBarberBySlug(
  slug: string
): Promise<Barber | null> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(barbers)
      .where(eq(barbers.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}

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
