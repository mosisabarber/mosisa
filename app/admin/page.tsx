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

export default async function AdminDashboardPage() {
  // Gate: redirect to /admin/login if not authenticated.
  const session = await requireAdmin();
  const appointments = await getTodaysAppointments();

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-cream">
          Today&apos;s appointments
        </h1>
        <Link href="/admin/appointments">
          <Button variant="secondary" size="sm">
            All appointments →
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <StateMessage
          state="empty"
          title="No appointments today"
          description="Bookings for today will appear here once made."
        />
      ) : (
        <Card className="overflow-hidden border-line p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Time
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Customer
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Service / Barber
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Manage
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
                    <div>{a.serviceName}</div>
                    <div className="text-xs text-cream-muted">
                      {a.barberName}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <AddToCalendar appointment={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
