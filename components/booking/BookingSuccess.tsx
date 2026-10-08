"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import {
  addisDateKey,
  formatAddisDateLabel,
  formatAddisSlotLabel,
  type DateLabelNames,
} from "@/lib/booking/time";
import { buildIcs, icsDataUrl } from "@/lib/notifications/calendar";

export interface BookingSuccessProps {
  appointmentId: string;
  managementToken: string;
  barberName: string;
  serviceName: string;
  durationMinutes: number;
  /** null → no price set for the service. */
  price: string | null;
  slotIso: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  labels: {
    title: string;
    body: string;
    reference: string;
    when: string;
    with: string;
    service: string;
    duration: string;
    price: string;
    name: string;
    phone: string;
    email: string;
    addToCalendar: string;
    manage: string;
    bookAnother: string;
    backHome: string;
    copyLink: string;
    copied: string;
    manageHint: string;
    minutes: string;
    birr: string;
  };
  /** Locale names so the date *and* the clock follow the locale. */
  dateNames?: DateLabelNames;
  /** Start the flow again from step 1. */
  onBookAnother: () => void;
  /** Locale-aware href to the home page. */
  homeHref: string;
}

/**
 * Inline success state shown in place of the wizard once a booking is created.
 *
 * Mirrors the actions of `BookingConfirmationModal` (calendar download + the
 * private manage link) but persists on the page, and also offers the two
 * "what now" actions the spec asks for: book another, or go home.
 */
export function BookingSuccess({
  appointmentId,
  managementToken,
  barberName,
  serviceName,
  durationMinutes,
  price,
  slotIso,
  customerName,
  customerEmail,
  labels: l,
  dateNames,
  onBookAnother,
  homeHref,
}: BookingSuccessProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const managePath = `/manage/${managementToken}`;
  const manageHref = `${siteUrl}${managePath}`;

  const ics = buildIcs({
    uid: `${appointmentId}@mosisa-barber-shop`,
    startIso: slotIso,
    endIso: new Date(Date.parse(slotIso) + durationMinutes * 60 * 1000).toISOString(),
    summary: `Appointment — ${serviceName} with ${barberName}`,
    description: `Your appointment at Mosisa Barber Shop.\nManage: ${manageHref}`,
    location: "Mosisa Barber Shop, Harar",
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(manageHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked (insecure context / denied) — the link is
      // still selectable in the text below, so this is a soft failure.
    }
  }

  return (
    <Card tone="raised" className="mx-auto max-w-2xl p-6 sm:p-8" role="status">
      <div className="text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/50 bg-success/15 font-heading text-2xl text-success"
          aria-hidden="true"
        >
          ✓
        </span>
        <h2 className="mt-4 font-heading text-2xl font-semibold">{l.title}</h2>
        <p className="mt-2 text-sm leading-6 text-cream-muted">{l.body}</p>
      </div>

      <div className="mt-6 rounded-md border border-line bg-surface p-4 text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            {l.reference}
          </span>
          <span className="font-mono text-xs text-cream" title={appointmentId}>
            {appointmentId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <dl className="mt-3 space-y-2.5">
          <Row label={l.service} value={serviceName} />
          <Row label={l.duration} value={`${durationMinutes} ${l.minutes}`} />
          <Row label={l.with} value={barberName} />
          <Row
            label={l.when}
            value={`${formatAddisDateLabel(addisDateKey(Date.parse(slotIso)), dateNames)} · ${formatAddisSlotLabel(
              slotIso,
              dateNames
            )} (Harar)`}
          />
          <Row label={l.name} value={customerName} />
        </dl>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-cream-muted">{l.price}</span>
          <span className="font-heading text-xl font-semibold text-brass-strong">
            {price ? `${price} ${l.birr}` : "—"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button onClick={() => window.location.assign(icsDataUrl(ics))}>
          {l.addToCalendar}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(managePath)}
        >
          {l.manage}
        </Button>
      </div>

      <p className="mt-4 text-xs leading-5 text-cream-muted">
        {l.manageHint}{" "}
        <a href={manageHref} className="break-all text-brass-strong underline">
          {manageHref}
        </a>{" "}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="ml-1 rounded border border-line px-2 py-0.5 text-[11px] font-medium text-cream-muted transition-colors hover:border-brass/40 hover:text-cream"
        >
          {copied ? l.copied : l.copyLink}
        </button>
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={onBookAnother}>
          {l.bookAnother}
        </Button>
        <a
          href={homeHref}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-surface-raised px-5 text-sm font-medium tracking-wide text-cream transition-colors hover:border-brass/50 hover:text-brass-strong focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {l.backHome}
        </a>
      </div>

      <p className="sr-only">
        {l.email}: {customerEmail}
      </p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cream-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
