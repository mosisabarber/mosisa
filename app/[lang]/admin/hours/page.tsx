/**
 * Staff shop-wide working-hours editor (AGENTS.md §3 / Stage 8).
 * One row per day_of_week (0=Sunday ... 6=Saturday). Each input patches the
 * matching row via /api/admin/working-hours (upsert route).
 */
import { getWorkingHours } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { WorkingHour } from "@/lib/admin-data";
import { Button, Card } from "@/components/ui";

function formatTimeField(t: string): string {
  // Postgres time column may come back as 'HH:mm:ss'; the <input> wants HH:mm.
  return t ? t.slice(0, 5) : "";
}

export default async function AdminHoursPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.admin;
  await requireAdmin(lang);
  const rows = await getWorkingHours();
  // Day names come from the dictionary so Amharic gets እሁድ/ሰኞ… for free.
  const days = dict.days.long;
  // Build a lookup so missing days render empty (and become upserts on save).
  const byDay = new Map<number, WorkingHour>();
  for (const row of rows) byDay.set(row.dayOfWeek, row);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
        {t.hours.title}
      </h1>

      <form action={saveHours}>
        <Card className="overflow-hidden p-0">
          {/* Wide screens: the full table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.hours.colDay}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.hours.colOpen}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.hours.colClose}
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, dow) => {
                  const row = byDay.get(dow);
                  return (
                    <tr key={dow} className="border-t border-line">
                      <td className="px-4 py-2.5 whitespace-nowrap">{day}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="time"
                          name={`open_${dow}`}
                          defaultValue={formatTimeField(row?.startTime ?? "")}
                          className="h-9 w-full min-w-28 rounded-md border border-line bg-charcoal px-2.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="time"
                          name={`close_${dow}`}
                          defaultValue={formatTimeField(row?.endTime ?? "")}
                          className="h-9 w-full min-w-28 rounded-md border border-line bg-charcoal px-2.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per day, no horizontal scrolling. The inputs keep
              the same `open_${dow}` / `close_${dow}` names as the table above so
              saveHours() receives the identical FormData shape. */}
          <ul className="divide-y divide-line md:hidden">
            {days.map((day, dow) => {
              const row = byDay.get(dow);
              return (
                <li key={dow} className="space-y-2 p-4">
                  <p className="text-sm font-medium text-cream">{day}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-cream-muted">
                        {t.hours.colOpen}
                      </span>
                      <input
                        type="time"
                        name={`open_${dow}`}
                        defaultValue={formatTimeField(row?.startTime ?? "")}
                        className="h-11 w-full rounded-md border border-line bg-charcoal px-2.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-cream-muted">
                        {t.hours.colClose}
                      </span>
                      <input
                        type="time"
                        name={`close_${dow}`}
                        defaultValue={formatTimeField(row?.endTime ?? "")}
                        className="h-11 w-full rounded-md border border-line bg-charcoal px-2.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Button
          type="submit"
          variant="primary"
          className="mt-4 w-full sm:w-auto"
        >
          {t.hours.save}
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
