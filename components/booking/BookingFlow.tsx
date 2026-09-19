"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, StateMessage } from "@/components/ui";
import { DayStripPicker } from "@/components/booking/DayStripPicker";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingConfirmationModal } from "@/components/booking/BookingConfirmationModal";
import { bookingInputSchema } from "@/lib/booking/validation";
import { addisDateKey, formatAddisTime, formatAddisDateLabel } from "@/lib/booking/time";
import { cn } from "@/lib/cn";

export interface FlowService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
}

export interface FlowBarber {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  services: FlowService[];
  barbers: FlowBarber[];
  initialBarberSlug?: string | null;
}

const DAY_MS = 24 * 3600 * 1000;
const WINDOW_DAYS = 14; // day-strip shows two weeks at a time
const MAX_HORIZON_DAYS = 60; // §4.6

function dateKeyFromMs(ms: number): string {
  return new Date(ms + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function stepLabel(n: number, title: string, done: boolean, active: boolean) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest",
        active ? "text-brass" : done ? "text-cream-muted" : "text-cream-muted/50"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
          active
            ? "border-brass text-brass"
            : done
              ? "border-cream-muted/60 text-cream-muted"
              : "border-line text-cream-muted/50"
        )}
      >
        {done ? "✓" : n}
      </span>
      {title}
    </p>
  );
}

export function BookingFlow({ services, barbers, initialBarberSlug }: Props) {
  const preselectedBarber = useMemo(
    () => barbers.find((b) => b.slug === initialBarberSlug) ?? null,
    [barbers, initialBarberSlug]
  );

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(
    preselectedBarber?.id ?? null
  );

  const [windowStartMs, setWindowStartMs] = useState<number | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [confirmation, setConfirmation] = useState<{
    appointmentId: string;
    managementToken: string;
    slotIso: string;
  } | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;

  const days = useMemo(() => {
    if (windowStartMs === null) return [];
    const keys: string[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      keys.push(dateKeyFromMs(windowStartMs + i * DAY_MS));
    }
    return keys;
  }, [windowStartMs]);


  // Once service + barber are chosen, open the first availability window.
  useEffect(() => {
    if (!serviceId || !barberId) return;
    setWindowStartMs((prev) => prev ?? Date.now());
  }, [serviceId, barberId]);

  // Fetch availability for the current 14-day window.
  useEffect(() => {
    if (windowStartMs === null || !serviceId || !barberId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const startDate = dateKeyFromMs(windowStartMs);
    const endDate = dateKeyFromMs(
      Math.min(
        windowStartMs + (WINDOW_DAYS - 1) * DAY_MS,
        Date.now() + (MAX_HORIZON_DAYS - 1) * DAY_MS
      )
    );

    setAvailabilityLoading(true);
    setAvailabilityError(null);

    fetch(
      `/api/booking/availability?barber_id=${barberId}&service_id=${serviceId}&start_date=${startDate}&end_date=${endDate}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`availability_${res.status}`);
        return (await res.json()) as {
          days: { date: string; slots: string[] }[];
        };
      })
      .then((data) => {
        setSlotsByDate((prev) => {
          const next = { ...prev };
          for (const day of data.days) next[day.date] = day.slots;
          return next;
        });
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setAvailabilityError(
          "We couldn't load opening times. Check your connection and try again."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [windowStartMs, serviceId, barberId]);

  const canAdvanceWindow =
    windowStartMs !== null &&
    windowStartMs + WINDOW_DAYS * DAY_MS <=
      Date.now() + MAX_HORIZON_DAYS * DAY_MS;

  /** True once the user has paged the window forward (so they can come back). */
  const canGoBackWindow =
    windowStartMs !== null && windowStartMs > Date.now() + DAY_MS;

  function refreshAfterRejection() {
    // Force the availability effect to re-fetch (e.g. after a 409 race).
    setWindowStartMs(null);
    setTimeout(() => setWindowStartMs(Date.now()), 0);
  }

  async function submit() {
    if (!service || !barber || !selectedSlot) return;

    const parsed = bookingInputSchema.safeParse({
      barber_id: barber.id,
      service_id: service.id,
      start_datetime: selectedSlot,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
    });

    if (!parsed.success) {
      setSubmitError(
        parsed.error.issues[0]?.message ?? "Please check your details."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        appointment_id?: string;
        management_token?: string;
        message?: string;
      };

      if (res.status === 201 && body.appointment_id && body.management_token) {
        setConfirmation({
          appointmentId: body.appointment_id,
          managementToken: body.management_token,
          slotIso: selectedSlot,
        });
        return;
      }

      if (res.status === 409) {
        setSubmitError(
          body.message ?? "That slot was just taken — pick another time."
        );
        refreshAfterRejection();
      } else if (res.status === 429) {
        setSubmitError(body.message ?? "Too many attempts — please wait a bit.");
      } else {
        setSubmitError(
          body.message ?? "Booking failed. Please try again in a moment."
        );
      }
    } catch {
      setSubmitError(
        "Network problem — we couldn't reach the shop. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0 || barbers.length === 0) {
    return (
      <Card>
        <StateMessage
          state="empty"
          title="Online booking is being set up"
          description="Services and barbers are still being configured. Please check back soon, or call the shop."
          className="py-14"
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_340px] lg:pb-4">
      <div className="flex flex-col gap-5">
        {/* 1 — Service */}
        <Card className="p-5">
          {stepLabel(1, "Choose a service", !!service, !service)}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={serviceId === s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                }}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  serviceId === s.id
                    ? "border-brass bg-brass/10"
                    : "border-line bg-surface hover:border-brass/40"
                )}
              >
                <span className="font-medium">{s.name}</span>
                <span className="mt-1 block text-xs text-cream-muted">
                  {s.durationMinutes} min · {s.price} Br
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* 2 — Barber */}
        <Card className="p-5">
          {stepLabel(2, "Choose your barber", !!barber, !!service && !barber)}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={barberId === b.id}
                onClick={() => {
                  setBarberId(b.id);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  barberId === b.id
                    ? "border-brass bg-brass/10"
                    : "border-line bg-surface hover:border-brass/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold",
                    barberId === b.id
                      ? "bg-brass text-charcoal"
                      : "bg-forest/50 text-brass-strong"
                  )}
                  aria-hidden="true"
                >
                  {b.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block text-xs text-cream-muted">
                    {barberId === b.id ? "Selected" : "Available"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* 3 — Date & time */}
        <Card className="p-4 sm:p-5">
          {stepLabel(
            3,
            "Pick a date & time",
            !!selectedSlot,
            !!service && !!barber && !selectedSlot
          )}
          <div className="mt-4 space-y-4">
            <DayStripPicker
              days={days}
              slotsByDate={slotsByDate}
              value={selectedDate}
              disabled={!service || !barber}
              todayKey={addisDateKey(Date.now())}
              onSelect={(dateKey) => {
                setSelectedDate(dateKey);
                setSelectedSlot(null);
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-xs text-cream-muted">
                {!service || !barber
                  ? "Pick a service and barber first"
                  : selectedDate
                    ? `Times for ${formatAddisDateLabel(selectedDate)}`
                    : "Pick a day above, then choose a time"}
              </p>
              <div className="flex items-center gap-2">
                {canGoBackWindow && (
                  <button
                    type="button"
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-cream-muted transition-colors hover:border-brass/40 hover:text-cream"
                    onClick={() =>
                      setWindowStartMs((prev) =>
                        Math.max(
                          (prev ?? Date.now()) - WINDOW_DAYS * DAY_MS,
                          Date.now()
                        )
                      )
                    }
                  >
                    ← Earlier
                  </button>
                )}
                {canAdvanceWindow && (
                  <button
                    type="button"
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-cream-muted transition-colors hover:border-brass/40 hover:text-cream"
                    onClick={() =>
                      setWindowStartMs(
                        (prev) => (prev ?? Date.now()) + WINDOW_DAYS * DAY_MS
                      )
                    }
                  >
                    Later dates →
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <TimeSlotGrid
                dateKey={selectedDate}
                slots={selectedDate ? (slotsByDate[selectedDate] ?? []) : []}
                value={selectedSlot}
                loading={availabilityLoading}
                error={availabilityError}
                onRetry={refreshAfterRejection}
                onSelect={setSelectedSlot}
              />
            </div>
          </div>
        </Card>

        {/* 4 — Contact details */}
        <Card className="p-5">
          {stepLabel(4, "Your details", false, !!selectedSlot && !confirmation)}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              name="customer_name"
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              name="customer_phone"
              label="Phone (Ethiopian)"
              placeholder="09xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
            <Input
              name="customer_email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="sm:col-span-2"
            />
          </div>
        </Card>
      </div>

      {/* Desktop: sticky summary sidebar */}
      <div className="hidden lg:block">
        <BookingSummary
          barberName={barber?.name ?? "—"}
          serviceName={service?.name ?? "—"}
          durationMinutes={service?.durationMinutes ?? 0}
          price={service?.price ?? "—"}
          slotIso={selectedSlot}
          submitting={submitting}
          error={submitError}
          onSubmit={submit}
        />
      </div>

      {/* Mobile: sticky action bar — the confirm button is always in reach */}
      {!confirmation && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-charcoal/95 px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {submitError && (
            <p
              className="mb-2 line-clamp-2 rounded-md border border-error/40 bg-error/10 px-3 py-1.5 text-xs text-error"
              role="alert"
            >
              {submitError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {service ? service.name : "Select a service"}
              </p>
              <p className="truncate text-xs text-cream-muted">
                {selectedSlot
                  ? `${formatAddisDateLabel(addisDateKey(Date.parse(selectedSlot)))} · ${formatAddisTime(Date.parse(selectedSlot))} · ${service?.price ?? ""} Br`
                  : service
                    ? `${service.durationMinutes} min · ${service.price} Br`
                    : "Pick a time"}
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={submit}
              loading={submitting}
              disabled={!selectedSlot}
            >
              {selectedSlot ? "Confirm" : "Pick a time"}
            </Button>
          </div>
        </div>
      )}

      {confirmation && service && barber && (
        <BookingConfirmationModal
          open
          onClose={() => setConfirmation(null)}
          appointmentId={confirmation.appointmentId}
          managementToken={confirmation.managementToken}
          barberName={barber.name}
          serviceName={service.name}
          slotIso={confirmation.slotIso}
          customerName={name}
          customerEmail={email}
          customerPhone={phone}
        />
      )}
    </div>
  );
}

