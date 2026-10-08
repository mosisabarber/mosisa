/**
 * Staff blocked-times management (AGENTS.md §3 / Stage 8).
 * Lists existing blocks + a simple create form (date range + optional barber).
 */
import { Suspense } from "react";
import { getBlockedTimes, getActiveBarbers } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { getAdminDictionary, getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeNames } from "@/lib/i18n/locale-names";
import {
  ADDIS_OFFSET_MS,
  formatAddisDateLabel,
  formatAddisTimeLabel,
  type DateLabelNames,
} from "@/lib/booking/time";
import { pickLocalized } from "@/lib/i18n/content";
import { Badge, Card, StateMessage } from "@/components/ui";

/** Addis wall-clock parts for a stored instant (Ethiopia is UTC+3 year-round). */
function dtParts(d: Date): { dateKey: string; time: string } {
  const iso = new Date(d.getTime() + ADDIS_OFFSET_MS).toISOString();
  return { dateKey: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * Full stamp for the table. English keeps the compact staff triage format;
 * Amharic renders the Ethiopian calendar and the 6:00 clock, which already read
 * as local time — so the UTC+3 note is dropped.
 */
function formatDt(d: Date, names: DateLabelNames): string {
  const { dateKey, time } = dtParts(d);
  return names.ethiopian
    ? `${formatAddisDateLabel(dateKey, names)} ${formatAddisTimeLabel(time, names)}`
    : `${dateKey} ${time} (UTC+3)`;
}

/**
 * Compact Addis Ababa date + time for the phone card layout — "YYYY-MM-DD" and
 * "HH:mm" separately, so each fits a card line without wrapping.
 */
function dtDate(d: Date, names: DateLabelNames): string {
  const { dateKey } = dtParts(d);
  return names.ethiopian ? formatAddisDateLabel(dateKey, names) : dateKey;
}

function dtTime(d: Date, names: DateLabelNames): string {
  return formatAddisTimeLabel(dtParts(d).time, names);
}

export default async function AdminBlockedTimesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const [t, dict] = await Promise.all([
    getAdminDictionary(lang),
    getDictionary(lang),
  ]);
  const locale = getLocale(lang);
  const names = localeNames(locale, dict);
  await requireAdmin(lang);
  const [blocks, barbers] = await Promise.all([getBlockedTimes(), getActiveBarbers()]);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-xl font-semibold text-cream sm:text-2xl">
        {t.blocked.title}
      </h1>

      <form
        action={createBlock}
        className="grid grid-cols-1 gap-4 sm:max-w-xl sm:grid-cols-2"
      >
        <input
          type="date"
          name="start"
          required
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <input
          type="date"
          name="end"
          required
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <select
          name="barber_id"
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        >
          <option value="">{t.blocked.entireShop}</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {pickLocalized(locale, b.name, b.nameAm) ?? b.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="reason"
          placeholder={t.blocked.reasonPlaceholder}
          className="h-11 w-full rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream placeholder:text-cream-muted focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
        />
        <button
          type="submit"
          className="h-11 w-full rounded-md bg-brass px-4 text-sm font-medium text-charcoal transition-colors hover:bg-brass-strong sm:col-span-2 sm:w-auto sm:justify-self-start"
        >
          {t.blocked.block}
        </button>
      </form>

      <Suspense fallback={<StateMessage state="loading" />}>
        <BlockedTimesTable blocks={blocks} t={t} names={names} />
      </Suspense>
    </section>
  );
}

function BlockedTimesTable({
  blocks,
  t,
  names,
}: {
  blocks: Awaited<ReturnType<typeof getBlockedTimes>>;
  t: Awaited<ReturnType<typeof getAdminDictionary>>;
  names: DateLabelNames;
}) {
  if (blocks.length === 0) {
    return <StateMessage state="empty" title={t.blocked.empty} />;
  }

  return (
    <Card className="overflow-hidden p-0">
      {/* Wide screens: the full table. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.blocked.colStart}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.blocked.colEnd}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.blocked.colReason}
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-cream-muted">
                {t.blocked.colBarber}
              </th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDt(b.startDatetime, names)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDt(b.endDatetime, names)}</td>
                <td className="px-4 py-2.5">{b.reason ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {b.barberId ? `#${b.barberId.slice(0, 8)}` : t.blocked.shopWide}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per block, no horizontal scrolling. */}
      <ul className="divide-y divide-line md:hidden">
        {blocks.map((b) => (
          <li key={b.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-cream">
                {b.reason ?? t.blocked.blockedTime}
              </span>
              <Badge tone={b.barberId ? "navy" : "neutral"}>
                {b.barberId ? `#${b.barberId.slice(0, 8)}` : t.blocked.shopWide}
              </Badge>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-cream-muted">{t.blocked.start}</dt>
              <dd className="text-right text-cream">
                {dtDate(b.startDatetime, names)}
                <span className="block text-xs text-cream-muted">
                  {dtTime(b.startDatetime, names)}
                </span>
              </dd>

              <dt className="text-cream-muted">{t.blocked.end}</dt>
              <dd className="text-right text-cream">
                {dtDate(b.endDatetime, names)}
                <span className="block text-xs text-cream-muted">
                  {dtTime(b.endDatetime, names)}
                </span>
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function createBlock(formData: FormData) {
  "use server";
  const start = new Date(formData.get("start") as string);
  const end = new Date(formData.get("end") as string);
  const startOfDay = new Date(start);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(end);
  endOfDay.setUTCHours(23, 59, 59, 999);

  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/blocked-times`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_datetime: startOfDay.toISOString(),
      end_datetime: endOfDay.toISOString(),
      barber_id: (formData.get("barber_id") as string) || null,
      reason: formData.get("reason") as string,
    }),
    cache: "no-store",
  });
}
