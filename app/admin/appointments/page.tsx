/**
 * Admin appointments list with filtering (AGENTS.md §6 / Stage 8).
 */
import { Suspense } from "react";
import { getAppointments } from "@/lib/admin-data";
import type { AppointmentList } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; dateFrom?: string; dateTo?: string }>;
}) {
  await requireAdmin();
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
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-cream">
          Appointments
        </h1>
      </div>

      <form className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <input
          type="text"
          name="search"
          defaultValue={sp.search}
          placeholder="Customer name…"
          className="text-sm"
        />
        <input type="date" name="dateFrom" defaultValue={sp.dateFrom} />
        <input type="date" name="dateTo" defaultValue={sp.dateTo} />
        <button
          type="submit"
          className="rounded-md bg-surface px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-surface-raised"
        >
          Filter
        </button>
      </form>

      <Suspense fallback={<StateMessage state="loading" />}>
        <AppointmentsTable appointments={appointments} />
      </Suspense>
    </section>
  );
}

async function AppointmentsTable({
  appointments,
}: {
  appointments: AppointmentList[];
}) {
  if (appointments.length === 0) {
    return <StateMessage state="empty" title="No appointments found." />;
  }

  return (
    <Card className="overflow-hidden border-line p-0">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
              When
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
              Customer
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
              Service
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
              Barber
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
              Status
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
                  {a.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
