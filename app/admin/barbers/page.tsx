/**
 * Staff barbers management (AGENTS.md §6 / Stage 8).
 */
import { getActiveBarbers } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { Badge, Card, StateMessage } from "@/components/ui";
import { BarberForm } from "@/components/admin/BarberForm";

export const dynamic = "force-dynamic";

export default async function AdminBarbersPage() {
  await requireAdmin();
  const barbers = await getActiveBarbers();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
          Barbers
        </h1>
        <BarberForm mode="create" />
      </div>

      {barbers.length === 0 ? (
        <StateMessage state="empty" title="No barbers yet" />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Wide screens: the full table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    Buffer
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    Active
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {barbers.map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className="px-4 py-2.5">{b.name}</td>
                    <td className="px-4 py-2.5">{b.bufferMinutes} min</td>
                    <td className="px-4 py-2.5">
                      {b.isActive ? "yes" : "no"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <BarberForm mode="edit" barber={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per barber, no horizontal scrolling. */}
          <ul className="divide-y divide-line md:hidden">
            {barbers.map((b) => (
              <li key={b.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-cream">{b.name}</span>
                  <Badge tone={b.isActive ? "forest" : "neutral"}>
                    {b.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-cream-muted">Buffer</dt>
                  <dd className="text-right text-cream">
                    {b.bufferMinutes} min
                  </dd>
                </dl>

                <BarberForm mode="edit" barber={b} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
