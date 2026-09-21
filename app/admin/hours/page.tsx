/**
 * Staff shop-wide working-hours editor (AGENTS.md §3 / Stage 8).
 * One row per day_of_week (0=Sunday ... 6=Saturday). Each input patches the
 * matching row via /api/admin/working-hours (upsert route).
 */
import { getWorkingHours } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import type { WorkingHour } from "@/lib/admin-data";
import { Button, Card } from "@/components/ui";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTimeField(t: string): string {
  // Postgres time column may come back as 'HH:mm:ss'; the <input> wants HH:mm.
  return t ? t.slice(0, 5) : "";
}

export default async function AdminHoursPage() {
  await requireAdmin();
  const rows = await getWorkingHours();
  // Build a lookup so missing days render empty (and become upserts on save).
  const byDay = new Map<number, WorkingHour>();
  for (const row of rows) byDay.set(row.dayOfWeek, row);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-cream">
        Working hours
      </h1>

      <form action={saveHours}>
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Day
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Open
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Close
                </th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dow) => {
                const row = byDay.get(dow);
                return (
                  <tr key={dow} className="border-t border-line">
                    <td className="px-4 py-2.5">{day}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="time"
                        name={`open_${dow}`}
                        defaultValue={formatTimeField(row?.startTime ?? "")}
                        className="w-full text-sm"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="time"
                        name={`close_${dow}`}
                        defaultValue={formatTimeField(row?.endTime ?? "")}
                        className="w-full text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Button type="submit" variant="primary" className="mt-4">
          Save hours
        </Button>
      </form>
    </section>
  );
}

async function saveHours(formData: FormData) {
  "use server";
  // Collect all day/time pairs and POST as JSON to the upsert route.
  const body: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    body[key] = value as string;
  }
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/working-hours`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
