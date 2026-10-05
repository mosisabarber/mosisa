/**
 * Admin dashboard landing (AGENTS.md §6 — Staff can see/operate the shop's
 * appointments; services, barbers, hours, and blocked times are managed on
 * their dedicated pages linked from the sidebar).
 *
 * Reads "today" appointments from the DB. Renders an empty state instead of
 * crashing if the DB is unavailable or unseeded.
 */
import Link from "next/link";
import { getTodaysAppointments, type AppointmentList } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { NameCell } from "@/components/admin/NameCell";
import { getAdminDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { Badge, Button, Card, StateMessage } from "@/components/ui";
import { AddToCalendar } from "@/components/admin/AddToCalendar";

const STATUS_TONE: Record<string, "brass" | "forest" | "navy" | "warning" | "error" | "neutral"> =
  {
    confirmed: "brass",
    completed: "forest",
    cancelled: "error",
    no_show: "warning",
  };

function formatAddis(date: Date): string {
  // Ethiopia is UTC+3 year-round; reuse the existing time helper's approach
  // without importing it here (keeps server-only code lean).
  const iso = new Date(date.getTime() + 3 * 3600 * 1000).toISOString();
  const datePart = iso.slice(0, 10);
  const timePart = iso.slice(11, 16);
  return `${datePart} ${timePart} (UTC+3)`;
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getAdminDictionary(lang);
  const locale = getLocale(lang);
  // Gate: redirect to the locale-prefixed login page if not authenticated.
  const session = await requireAdmin(lang);
  const appointments = await getTodaysAppointments();
  const statusLabel = (s: string) =>
    ({
      confirmed: t.status.confirmed,
      completed: t.status.completed,
      cancelled: t.status.cancelled,
      no_show: t.status.noShow,
    })[s] ?? s;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
          {t.dashboard.title}
        </h1>
        <Link href={`/${lang}/admin/appointments`}>
          <Button variant="secondary" size="sm">
            {t.dashboard.allAppointments}
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <StateMessage
          state="empty"
          title={t.dashboard.emptyTitle}
          description={t.dashboard.emptyBody}
        />
      ) : (
        <Card className="overflow-hidden border-line p-0">
          {/* Wide screens: the full table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.dashboard.colTime}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.dashboard.colCustomer}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.dashboard.colServiceBarber}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.dashboard.colStatus}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.dashboard.colManage}
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-line odd:bg-charcoal even:bg-surface/30"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatAddis(a.startDatetime)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        <span className="font-medium text-cream">
                          {a.customerName}
                        </span>
                        <span className="block text-xs text-cream-muted">
                          {a.customerPhone}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        <NameCell locale={locale} en={a.serviceName} am={a.serviceNameAm} />
                      </div>
                      <div className="text-xs text-cream-muted">
                        <NameCell locale={locale} en={a.barberName} am={a.barberNameAm} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                        {statusLabel(a.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <AddToCalendar appointment={a} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per appointment, no horizontal scrolling. */}
          <ul className="divide-y divide-line md:hidden">
            {appointments.map((a) => (
              <li key={a.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-cream">
                    {formatAddis(a.startDatetime)}
                  </span>
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                    {statusLabel(a.status)}
                  </Badge>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-cream-muted">{t.dashboard.customer}</dt>
                  <dd className="text-right text-cream">
                    {a.customerName}
                    <span className="block text-xs text-cream-muted">
                      {a.customerPhone}
                    </span>
                  </dd>

                  <dt className="text-cream-muted">{t.dashboard.service}</dt>
                  <dd className="text-right text-cream">
                    <NameCell locale={locale} en={a.serviceName ?? "—"} am={a.serviceNameAm} />
                  </dd>

                  <dt className="text-cream-muted">{t.dashboard.barber}</dt>
                  <dd className="text-right text-cream">
                    <NameCell locale={locale} en={a.barberName ?? "—"} am={a.barberNameAm} />
                  </dd>
                </dl>

                <AddToCalendar appointment={a} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
