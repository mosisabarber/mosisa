/**
 * Admin appointments list with filtering (AGENTS.md §6 / Stage 8).
 */
import { Suspense } from "react";
import { getAppointments } from "@/lib/admin-data";
import type { AppointmentList } from "@/lib/admin-data";
import {
  appointmentRangeBounds,
  parseAppointmentRange,
} from "@/lib/admin-ranges";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { NameCell } from "@/components/admin/NameCell";
import { RangeSelect } from "@/components/admin/RangeSelect";
import { getAdminDictionary, getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeNames } from "@/lib/i18n/locale-names";
import {
  ADDIS_OFFSET_MS,
  formatAddisDateLabel,
  formatAddisTimeLabel,
  type DateLabelNames,
} from "@/lib/booking/time";
import type { Locale } from "@/lib/i18n/config";
import { Badge, Card, StateMessage } from "@/components/ui";

const STATUS_TONE: Record<string, "brass" | "forest" | "navy" | "warning" | "error" | "neutral"> =
  {
    confirmed: "brass",
    completed: "forest",
    cancelled: "error",
    no_show: "warning",
  };

/** Addis wall-clock parts for a stored instant (Ethiopia is UTC+3 year-round). */
function addisParts(date: Date): { dateKey: string; time: string } {
  const iso = new Date(date.getTime() + ADDIS_OFFSET_MS).toISOString();
  return { dateKey: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * Full stamp for the table. English keeps the compact staff triage format;
 * Amharic renders the Ethiopian calendar and the 6:00 clock, which already read
 * as local time — so the UTC+3 note is dropped.
 */
function formatAddis(date: Date, names: DateLabelNames): string {
  const { dateKey, time } = addisParts(date);
  return names.ethiopian
    ? `${formatAddisDateLabel(dateKey, names)} ${formatAddisTimeLabel(time, names)}`
    : `${dateKey} ${time} (UTC+3)`;
}

/**
 * Compact Addis Ababa time for the phone card layout: the full
 * "YYYY-MM-DD HH:mm (UTC+3)" string is too long to sit on one card line, so
 * cards show the date once and the start–end times beneath it.
 */
function addisDate(date: Date, names: DateLabelNames): string {
  const { dateKey } = addisParts(date);
  return names.ethiopian ? formatAddisDateLabel(dateKey, names) : dateKey;
}

function addisTime(date: Date, names: DateLabelNames): string {
  return formatAddisTimeLabel(addisParts(date).time, names);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    range?: string;
  }>;
}) {
  const { lang } = await params;
  const [t, dict] = await Promise.all([
    getAdminDictionary(lang),
    getDictionary(lang),
  ]);
  const locale = getLocale(lang);
  const names = localeNames(locale, dict);
  // The Ethiopian clock reads as local time on its own; only English keeps the
  // UTC+3 note.
  const zoneNote = names.ethiopian ? "" : " (UTC+3)";
  await requireAdmin(lang);
  const sp = await searchParams;
  const status = sp.status as "confirmed" | "cancelled" | "completed" | "no_show" | undefined;
  // A picked range wins over the manual date inputs; submitting the filter form
  // below sends an empty `range` to clear it.
  const range = parseAppointmentRange(sp.range);
  const bounds = range ? appointmentRangeBounds(range) : null;
  const appointments = await getAppointments({
    status,
    search: sp.search,
    dateFrom: bounds?.fromIso ?? sp.dateFrom,
    dateTo: bounds?.toIso ?? sp.dateTo,
  });

  const showStatus = (s: string) =>
    s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(",");


  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
          {t.appointments.title}
        </h1>
        <RangeSelect
          value={range ?? "all"}
          t={t.ranges}
          basePath="/admin/appointments"
          preserve={{ status: sp.status, search: sp.search }}
        />
      </div>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Clears any picked range so the manual filters apply on their own. */}
        <input type="hidden" name="range" value="" />
        <input
          type="text"
          name="search"
          defaultValue={sp.search}
          placeholder={t.appointments.searchPlaceholder}
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream placeholder:text-cream-muted focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <input
          type="date"
          name="dateFrom"
          defaultValue={sp.dateFrom}
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={sp.dateTo}
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <button
          type="submit"
          className="h-11 w-full rounded-md bg-surface px-4 text-sm font-medium text-cream transition-colors hover:bg-surface-raised sm:w-auto"
        >
          {t.appointments.filter}
        </button>
      </form>

      <Suspense fallback={<StateMessage state="loading" />}>
        <AppointmentsTable
          appointments={appointments}
          t={t}
          locale={locale}
          names={names}
          zoneNote={zoneNote}
        />
      </Suspense>
    </section>
  );
}

async function AppointmentsTable({
  appointments,
  t,
  locale,
  names,
  zoneNote,
}: {
  appointments: AppointmentList[];
  t: Awaited<ReturnType<typeof getAdminDictionary>>;
  locale: Locale;
  names: DateLabelNames;
  /** " (UTC+3)" for English, empty for Amharic (the Ethiopian clock is local). */
  zoneNote: string;
}) {
  if (appointments.length === 0) {
    return <StateMessage state="empty" title={t.appointments.empty} />;
  }

  const statusLabel = (s: string) =>
    ({
      confirmed: t.status.confirmed,
      completed: t.status.completed,
      cancelled: t.status.cancelled,
      no_show: t.status.noShow,
    })[s] ?? s;

  return (
    <Card className="overflow-hidden border-line p-0">
      {/* Wide screens: the full table. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.appointments.colWhen}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.appointments.colCustomer}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.appointments.colService}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.appointments.colBarber}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.appointments.colStatus}
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
                  {formatAddis(a.startDatetime, names)} →{" "}
                  {formatAddis(a.endDatetime, names)}
                </td>
                <td className="px-4 py-2.5">
                  {a.customerName}
                  <span className="block text-xs text-cream-muted">
                    {a.customerPhone}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <NameCell locale={locale} en={a.serviceName} am={a.serviceNameAm} />
                </td>
                <td className="px-4 py-2.5">
                  <NameCell locale={locale} en={a.barberName ?? "—"} am={a.barberNameAm} />
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                    {statusLabel(a.status)}
                  </Badge>
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
              <div className="min-w-0">
                <span className="block text-sm font-medium text-cream">
                  {addisDate(a.startDatetime, names)}
                </span>
                <span className="text-xs text-cream-muted">
                  {addisTime(a.startDatetime, names)} →{" "}
                  {addisTime(a.endDatetime, names)}
                  {zoneNote}
                </span>
              </div>
              <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                {statusLabel(a.status)}
              </Badge>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-cream-muted">{t.appointments.customer}</dt>
              <dd className="text-right text-cream">
                {a.customerName}
                <span className="block text-xs text-cream-muted">
                  {a.customerPhone}
                </span>
              </dd>

              <dt className="text-cream-muted">{t.appointments.service}</dt>
              <dd className="text-right text-cream">
                <NameCell locale={locale} en={a.serviceName ?? "—"} am={a.serviceNameAm} />
              </dd>

              <dt className="text-cream-muted">{t.appointments.barber}</dt>
              <dd className="text-right text-cream">
                <NameCell locale={locale} en={a.barberName ?? "—"} am={a.barberNameAm} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}
