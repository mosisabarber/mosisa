/**
 * Staff blocked-times management (AGENTS.md §3 / Stage 8).
 * Lists existing blocks + a simple create form (date range + optional barber).
 */
import { Suspense } from "react";
import { getBlockedTimes, getActiveBarbers } from "@/lib/admin-data";
import { requireAdmin } from "@/components/admin/AdminPageGate";
import { Card, StateMessage } from "@/components/ui";

function formatDt(d: Date): string {
  const iso = new Date(d.getTime() + 3 * 3600 * 1000).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} (UTC+3)`;
}

export default async function AdminBlockedTimesPage() {
  await requireAdmin();
  const [blocks, barbers] = await Promise.all([getBlockedTimes(), getActiveBarbers()]);

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-cream">
        Blocked times
      </h1>

      <form action={createBlock} className="grid grid-cols-1 gap-4 sm:max-w-xl">
        <input type="date" name="start" required />
        <input type="date" name="end" required />
        <select name="barber_id">
          <option value="">Entire shop (all barbers)</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input type="text" name="reason" placeholder="Holiday, closure, etc." />
        <button
          type="submit"
          className="rounded-md bg-brass px-4 py-2 text-sm font-medium text-charcoal hover:bg-brass-strong"
        >
          Block
        </button>
      </form>

      <Suspense fallback={<StateMessage state="loading" />}>
        <BlockedTimesTable blocks={blocks} />
      </Suspense>
    </section>
  );
}

function BlockedTimesTable({ blocks }: { blocks: Awaited<ReturnType<typeof getBlockedTimes>> }) {
  if (blocks.length === 0) {
    return <StateMessage state="empty" title="No blocked times scheduled." />;
  }

  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">Start</th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">End</th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">Reason</th>
            <th className="px-4 py-2.5 text-left font-medium text-cream-muted">Barber</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id} className="border-t border-line">
              <td className="px-4 py-2.5">{formatDt(b.startDatetime)}</td>
              <td className="px-4 py-2.5">{formatDt(b.endDatetime)}</td>
              <td className="px-4 py-2.5">{b.reason ?? "—"}</td>
              <td className="px-4 py-2.5">{b.barberId ? `#${b.barberId.slice(0, 8)}` : "Shop-wide"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
