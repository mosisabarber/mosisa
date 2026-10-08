/**
 * Admin dashboard landing (AGENTS.md §6 — Staff can see/operate the shop's
 * appointments; services, barbers, hours, and blocked times are managed on
 * their dedicated pages linked from the sidebar).
 *
 * Reads the appointments for the selected range (?range=today by default,
 * bounded on Addis midnight). Renders an empty state instead of crashing if the
 * DB is unavailable or unseeded.
 */
import { getAppointmentsForRange, type AppointmentList } from "@/lib/admin-data";
import { parseAppointmentRange } from "@/lib/admin-ranges";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { NameCell } from "@/components/admin/NameCell";
import { RangeSelect } from "@/components/admin/RangeSelect";
import { getAdminDictionary, getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeNames } from "@/lib/i18n/locale-names";
import { formatTemplate } from "@/lib/i18n/format";
import {
  ADDIS_OFFSET_MS,
  formatAddisDateLabel,
  formatAddisTimeLabel,
  type DateLabelNames,
} from "@/lib/booking/time";
import { Badge, Card, StateMessage } from "@/components/ui";
import { AddToCalendar } from "@/components/admin/AddToCalendar";

const STATUS_TONE: Record<string, "brass" | "forest" | "navy" | "warning" | "error" | "neutral"> =
  {
    confirmed: "brass",
    completed: "forest",
    cancelled: "error",
    no_show: "warning",
  };

/**
 * Addis wall-clock stamp (Ethiopia is UTC+3 year-round). English keeps the
 * compact staff triage format; Amharic renders the Ethiopian calendar and the
 * 6:00 clock, which already read as local time — so the UTC+3 note is dropped.
 */
function formatAddis(date: Date, names: DateLabelNames): string {
  const iso = new Date(date.getTime() + ADDIS_OFFSET_MS).toISOString();
  const dateKey = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return names.ethiopian
    ? `${formatAddisDateLabel(dateKey, names)} ${formatAddisTimeLabel(time, names)}`
    : `${dateKey} ${time} (UTC+3)`;
}

export default async function AdminDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { lang } = await params;
  const [t, dict] = await Promise.all([
    getAdminDictionary(lang),
    getDictionary(lang),
  ]);
  const locale = getLocale(lang);
  const names = localeNames(locale, dict);
  // Gate: redirect to the locale-prefixed login page if not authenticated.
  const session = await requireAdmin(lang);
  const sp = await searchParams;
  const range = parseAppointmentRange(sp.range) ?? "today";
  const appointments = await getAppointmentsForRange(range);
  const rangeLabel = t.ranges[range];
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
          {t.dashboard.headings[range]}
        </h1>
        <RangeSelect
          value={range}
          t={t.ranges}
          basePath="/admin"
          allHrefPath="/admin/appointments"
        />
      </div>

      {appointments.length === 0 ? (
        <StateMessage
          state="empty"
          title={formatTemplate(t.dashboard.emptyTitle, { range: rangeLabel })}
          description={formatTemplate(t.dashboard.emptyBody, {
            range: rangeLabel,
          })}
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
                      {formatAddis(a.startDatetime, names)}
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
                    {formatAddis(a.startDatetime, names)}
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
