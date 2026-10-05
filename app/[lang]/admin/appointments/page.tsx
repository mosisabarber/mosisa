/**
 * Admin appointments list with filtering (AGENTS.md §6 / Stage 8).
 */
import { Suspense } from "react";
import { getAppointments } from "@/lib/admin-data";
import type { AppointmentList } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { getAdminDictionary } from "@/lib/i18n/get-dictionary";
import { Badge, Card, StateMessage } from "@/components/ui";

const STATUS_TONE: Record<string, "brass" | "forest" | "navy" | "warning" | "error" | "neutral"> =
  {
    confirmed: "brass",
    completed: "forest",
    cancelled: "error",
    no_show: "warning",
  };

function formatAddis(date: Date): string {
  const iso = new Date(date.getTime() + 3 * 3600 * 1000).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} (UTC+3)`;
}

/**
 * Compact Addis Ababa time for the phone card layout: the full
 * "YYYY-MM-DD HH:mm (UTC+3)" string is too long to sit on one card line, so
 * cards show the date once and the start–end times beneath it.
 */
function addisDate(date: Date): string {
  return new Date(date.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function addisTime(date: Date): string {
  return new Date(date.getTime() + 3 * 3600 * 1000).toISOString().slice(11, 16);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string; search?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { lang } = await params;
  const t = await getAdminDictionary(lang);
  await requireAdmin(lang);
  const sp = await searchParams;
  const status = sp.status as "confirmed" | "cancelled" | "completed" | "no_show" | undefined;
  const appointments = await getAppointments({
    status,
    search: sp.search,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
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
      </div>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
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
        <AppointmentsTable appointments={appointments} t={t} />
      </Suspense>
    </section>
  );
}

async function AppointmentsTable({
  appointments,
  t,
}: {
  appointments: AppointmentList[];
  t: Awaited<ReturnType<typeof getAdminDictionary>>;
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
                  {formatAddis(a.startDatetime)} →{" "}
                  {formatAddis(a.endDatetime)}
                </td>
                <td className="px-4 py-2.5">
                  {a.customerName}
                  <span className="block text-xs text-cream-muted">
                    {a.customerPhone}
                  </span>
                </td>
                <td className="px-4 py-2.5">{a.serviceName}</td>
                <td className="px-4 py-2.5">{a.barberName ?? "—"}</td>
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
                  {addisDate(a.startDatetime)}
                </span>
                <span className="text-xs text-cream-muted">
                  {addisTime(a.startDatetime)} → {addisTime(a.endDatetime)}{" "}
                  (UTC+3)
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
              <dd className="text-right text-cream">{a.serviceName ?? "—"}</dd>

              <dt className="text-cream-muted">{t.appointments.barber}</dt>
              <dd className="text-right text-cream">{a.barberName ?? "—"}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}
