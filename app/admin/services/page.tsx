/**
 * Admin services management (AGENTS.md §6 / Stage 8).
 * - GET: list all services with edit links.
 * - The edit modal/form posts to /api/admin/services/<id> (PATCH) and the
 *   create form to /api/admin/services (POST). Both are handled by the shared
 *   [resource] route handler so we don't duplicate CRUD per entity.
 */
import Link from "next/link";
import { getAllServices } from "@/lib/admin-data";
import { Button, Card, StateMessage } from "@/components/ui";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { requireAdmin } from "@/components/admin/AdminPageGate";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await getAllServices();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-cream">
          Services
        </h1>
        <ServiceForm mode="create" />
      </div>

      {services.length === 0 ? (
        <StateMessage state="empty" title="No services yet" />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Duration
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Price
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                  Active
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">{s.durationMinutes} min</td>
                  <td className="px-4 py-2.5">{Number(s.price).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    {s.isActive ? "yes" : "no"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ServiceForm mode="edit" service={s} />
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
