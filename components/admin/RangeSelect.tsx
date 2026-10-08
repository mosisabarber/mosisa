/**
 * Staff range filter for the admin dashboard and appointments list
 * (AGENTS.md §6).
 *
 * A native `<select>`: the admin forms are all native controls and there is no
 * dropdown primitive in `components/ui`. Changing it navigates with
 * `?range=…`, so the choice survives a refresh and can be bookmarked.
 */
"use client";

import { useRouter } from "next/navigation";
import {
  APPOINTMENT_RANGES,
  type AppointmentRangeOption,
} from "@/lib/admin-ranges";
import { useLocaleHref } from "@/lib/i18n/links";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type RangeT = Dictionary["admin"]["ranges"];

export interface RangeSelectProps {
  /** Option currently applied, derived from `?range=` by the server page. */
  value: AppointmentRangeOption;
  t: RangeT;
  /** Locale-less path to re-render when a range is picked. */
  basePath: string;
  /** Other query params to keep (e.g. the appointments status filter). */
  preserve?: Record<string, string | undefined>;
  /** Destination for "All appointments"; omit to just clear the range here. */
  allHrefPath?: string;
}

export function RangeSelect({
  value,
  t,
  basePath,
  preserve = {},
  allHrefPath,
}: RangeSelectProps) {
  const router = useRouter();
  const href = useLocaleHref();

  function go(next: AppointmentRangeOption) {
    if (next === "all" && allHrefPath) {
      router.push(href(allHrefPath));
      return;
    }

    const params = new URLSearchParams();
    for (const [key, v] of Object.entries(preserve)) {
      if (v) params.set(key, v);
    }
    // "all" here means "no range filter", so the param is simply dropped.
    if (next !== "all") params.set("range", next);

    const query = params.toString();
    router.push(query ? `${href(basePath)}?${query}` : href(basePath));
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="admin-range" className="text-sm text-cream-muted">
        {t.label}
      </label>
      <select
        id="admin-range"
        value={value}
        onChange={(event) => go(event.target.value as AppointmentRangeOption)}
        className="h-11 rounded-md border border-line bg-charcoal px-3.5 text-sm text-cream focus:border-brass focus:ring-1 focus:ring-brass/40 focus:outline-none"
      >
        {APPOINTMENT_RANGES.map((r) => (
          <option key={r} value={r}>
            {t[r]}
          </option>
        ))}
        <option value="all">{t.all}</option>
      </select>
    </div>
  );
}
