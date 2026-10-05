/**
 * Admin services management (AGENTS.md §6 / Stage 8).
 * - GET: list all services with edit links.
 * - The edit modal/form posts to /api/admin/services/<id> (PATCH) and the
 *   create form to /api/admin/services (POST). Both are handled by the shared
 *   [resource] route handler so we don't duplicate CRUD per entity.
 */
import Link from "next/link";
import { getAllServices } from "@/lib/admin-data";
import { Badge, Card, StateMessage } from "@/components/ui";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { requireAdmin } from "@/components/admin/AdminPageGate";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await getAllServices();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
          Services
        </h1>
        <ServiceForm mode="create" />
      </div>

      {services.length === 0 ? (
        <StateMessage state="empty" title="No services yet" />
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
          </div>

          {/* Phones: one card per service, no horizontal scrolling. */}
          <ul className="divide-y divide-line md:hidden">
            {services.map((s) => (
              <li key={s.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-cream">{s.name}</span>
                  <Badge tone={s.isActive ? "forest" : "neutral"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-cream-muted">Duration</dt>
                  <dd className="text-right text-cream">
                    {s.durationMinutes} min
                  </dd>

                  <dt className="text-cream-muted">Price</dt>
                  <dd className="text-right text-cream">
                    {Number(s.price).toFixed(2)} ETB
                  </dd>
                </dl>

                <ServiceForm mode="edit" service={s} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
