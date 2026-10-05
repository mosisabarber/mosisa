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
import { NameCell } from "@/components/admin/NameCell";
import { getAdminDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getAdminDictionary(lang);
  const locale = getLocale(lang);
  await requireAdmin(lang);
  const services = await getAllServices();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
          {t.services.title}
        </h1>
        <ServiceForm mode="create" t={t.services} common={t.common} />
      </div>

      {services.length === 0 ? (
        <StateMessage state="empty" title={t.services.empty} />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Wide screens: the full table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.services.colName}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.services.colDuration}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.services.colPrice}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                    {t.services.colActive}
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <NameCell locale={locale} en={s.name} am={s.nameAm} />
                    </td>
                    <td className="px-4 py-2.5">
                      {s.durationMinutes} {t.common.min}
                    </td>
                    <td className="px-4 py-2.5">{Number(s.price).toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      {s.isActive ? t.common.yes : t.common.no}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ServiceForm mode="edit" service={s} t={t.services} common={t.common} />
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
                  <span className="font-medium text-cream">
                    <NameCell locale={locale} en={s.name} am={s.nameAm} />
                  </span>
                  <Badge tone={s.isActive ? "forest" : "neutral"}>
                    {s.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-cream-muted">{t.services.colDuration}</dt>
                  <dd className="text-right text-cream">
                    {s.durationMinutes} {t.common.min}
                  </dd>

                  <dt className="text-cream-muted">{t.services.colPrice}</dt>
                  <dd className="text-right text-cream">
                    {Number(s.price).toFixed(2)} {t.common.etb}
                  </dd>
                </dl>

                <ServiceForm mode="edit" service={s} t={t.services} common={t.common} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
