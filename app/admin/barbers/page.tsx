/**
 * Staff barbers management (AGENTS.md §6 / Stage 8).
 */
import { getActiveBarbers } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { Card, StateMessage } from "@/components/ui";
import { BarberForm } from "@/components/admin/BarberForm";

export const dynamic = "force-dynamic";

export default async function AdminBarbersPage() {
  await requireAdmin();
  const barbers = await getActiveBarbers();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-cream">
          Barbers
        </h1>
        <BarberForm mode="create" />
      </div>

      {barbers.length === 0 ? (
        <StateMessage state="empty" title="No barbers yet" />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
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
        </Card>
      )}
    </section>
  );
}
