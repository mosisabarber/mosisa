"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Input, StateMessage } from "@/components/ui";
import { DayStripPicker } from "@/components/booking/DayStripPicker";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import type { TakenSlot } from "@/components/booking/TimeSlotGrid";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { WizardNav } from "@/components/booking/WizardNav";
import { bookingInputSchema, ethiopianPhone } from "@/lib/booking/validation";
import { addisDateKey, formatAddisDateLabel } from "@/lib/booking/time";
import { localeNames } from "@/lib/i18n/locale-names";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";
import { localeHref } from "@/lib/i18n/links";
import { cn } from "@/lib/cn";

export interface FlowService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  /** null → no price set for the service. */
  price: string | null;
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
  dictionary: Dictionary;
  locale: Locale;
}

const DAY_MS = 24 * 3600 * 1000;
const WINDOW_DAYS = 14; // day-strip shows two weeks at a time
const MAX_HORIZON_DAYS = 60; // §4.6

/** Wizard step order — must match the labels passed to `<StepIndicator>`. */
const STEP = {
  SERVICE: 0,
  BARBER: 1,
  DATE: 2,
  TIME: 3,
  DETAILS: 4,
  CONFIRM: 5,
} as const;

function dateKeyFromMs(ms: number): string {
  return new Date(ms + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function BookingFlow({
  services,
  barbers,
  initialBarberSlug,
  dictionary: t,
  locale,
}: Props) {
  const preselectedBarber = useMemo(
    () => barbers.find((b) => b.slug === initialBarberSlug) ?? null,
    [barbers, initialBarberSlug]
  );

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(
    preselectedBarber?.id ?? null
  );

  // --- Wizard navigation -----------------------------------------------------
  const [step, setStep] = useState<number>(STEP.SERVICE);
  const [furthestStep, setFurthestStep] = useState<number>(STEP.SERVICE);
  const topRef = useRef<HTMLDivElement | null>(null);

  const [windowStartMs, setWindowStartMs] = useState<number | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [takenByDate, setTakenByDate] = useState<Record<string, TakenSlot[]>>({});
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  /** Bumped to re-run the availability fetch without changing the window. */
  const [refreshNonce, setRefreshNonce] = useState(0);
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

  /**
   * Amharic readers expect the Ethiopian calendar *and* the Ethiopian clock:
   * dates switch to መስከረም…ጳጉሜን with the Ethiopian year, and times to the
   * 6:00-based 12-hour dial (09:00 → 3:00 ጠዋት). English keeps Gregorian dates
   * and 24-hour times.
   */
  const dateNames = localeNames(locale, t);

  // --- Field validation (mirrors bookingInputSchema on the client) -----------
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});

  /** Validate the customer fields the same way the server will. */
  function validateDetails(): { name?: string; phone?: string; email?: string } {
    const errors: { name?: string; phone?: string; email?: string } = {};

    if (name.trim().length < 2) {
      errors.name = t.book.errors.nameRequired;
    } else if (name.trim().length > 80) {
      errors.name = t.book.errors.nameTooLong;
    }

    const parsedPhone = ethiopianPhone.safeParse(phone);
    if (!phone.trim()) {
      errors.phone = t.book.errors.phoneRequired;
    } else if (!parsedPhone.success) {
      errors.phone = t.book.errors.phoneInvalid;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = t.book.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail.toLowerCase())) {
      errors.email = t.book.errors.emailInvalid;
    }

    return errors;
  }

  const detailsValid = Object.keys(validateDetails()).length === 0;

  /** Move to a step and record it as the furthest reached. */
  function goToStep(next: number) {
    setStep(next);
    setFurthestStep((prev) => Math.max(prev, next));
    // Drop the customer out of the error banner when leaving the confirm step.
    if (next !== STEP.CONFIRM) setSubmitError(null);
    // Bring the step indicator back into view on small screens.
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /** Validate the current step; returns true when Continue may proceed. */
  function canContinueFrom(current: number): boolean {
    switch (current) {
      case STEP.SERVICE:
        return !!service;
      case STEP.BARBER:
        return !!barber;
      case STEP.DATE:
        return !!selectedDate;
      case STEP.TIME:
        return !!selectedSlot;
      case STEP.DETAILS:
        return detailsValid;
      default:
        return true;
    }
  }

  function handleContinue() {
    if (step === STEP.DETAILS) {
      const errors = validateDetails();
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    if (!canContinueFrom(step)) return;
    goToStep(Math.min(step + 1, STEP.CONFIRM));
  }

  function handleBack() {
    setSubmitError(null);
    setStep((prev) => Math.max(prev - 1, STEP.SERVICE));
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /** Restart the flow from step 1 (used by "Book another"). */
  function bookAnother() {
    setConfirmation(null);
    setServiceId(null);
    setBarberId(null);
    setWindowStartMs(null);
    setSlotsByDate({});
    setTakenByDate({});
    setClosedDates([]);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSubmitError(null);
    setFieldErrors({});
    setStep(STEP.SERVICE);
    setFurthestStep(STEP.SERVICE);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

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
          days: {
            date: string;
            slots: string[];
            takenSlots?: TakenSlot[];
            closed?: boolean;
          }[];
        };
      })
      .then((data) => {
        setSlotsByDate((prev) => {
          const next = { ...prev };
          for (const day of data.days) next[day.date] = day.slots;
          return next;
        });
        setTakenByDate((prev) => {
          const next = { ...prev };
          for (const day of data.days) next[day.date] = day.takenSlots ?? [];
          return next;
        });
        setClosedDates(
          data.days.filter((day) => day.closed).map((day) => day.date)
        );

        // If the chosen time was taken in the meantime (or is no longer
        // offered), drop the selection rather than submitting a dead slot —
        // and tell the customer why instead of letting it vanish silently.
        setSelectedSlot((current) => {
          if (!current) return current;
          const day = data.days.find((d) => d.date === addisDateKey(Date.parse(current)));
          if (!day || day.slots.includes(current)) return current;
          setSubmitError(t.book.errors.slotTaken);
          return null;
        });
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setAvailabilityError(t.book.errors.generic);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [windowStartMs, serviceId, barberId, refreshNonce]);

  const canAdvanceWindow =
    windowStartMs !== null &&
    windowStartMs + WINDOW_DAYS * DAY_MS <=
      Date.now() + MAX_HORIZON_DAYS * DAY_MS;

  /** True once the user has paged the window forward (so they can come back). */
  const canGoBackWindow =
    windowStartMs !== null && windowStartMs > Date.now() + DAY_MS;

  /**
   * Re-run the availability fetch for the window currently on screen (e.g.
   * after a 409 race). A nonce bumps the effect's dependency array so the
   * grid refreshes in place — resetting `windowStartMs` would jump the user
   * back to today and make their chosen time appear to vanish.
   */
  function refreshAfterRejection() {
    setRefreshNonce((n) => n + 1);
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
        parsed.error.issues[0]?.message ?? t.book.errors.generic
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
        limit?: string;
      };

      if (res.status === 201 && body.appointment_id && body.management_token) {
        setConfirmation({
          appointmentId: body.appointment_id,
          managementToken: body.management_token,
          slotIso: selectedSlot,
        });
        return;
      }

      // Prefer the localized dictionary message for known statuses — server
      // messages are English-only and must not override the customer's
      // language. Keep the server text only as an unmapped fallback.
      if (res.status === 409) {
        setSubmitError(t.book.errors.slotTaken ?? body.message);
        refreshAfterRejection();
      } else if (res.status === 429) {
        setSubmitError(
          body.limit === "phone"
            ? (t.book.errors.rateLimitedPhone ?? body.message)
            : (t.book.errors.rateLimitedIp ?? body.message)
        );
      } else {
        setSubmitError(t.book.errors.generic);
      }
    } catch {
      setSubmitError(t.book.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0 || barbers.length === 0) {
    return (
      <Card>
        <StateMessage
          state="empty"
          title={t.book.title}
          description={t.book.subtitle}
          className="py-14"
        />
      </Card>
    );
  }

  // --- Success state ---------------------------------------------------------
  if (confirmation && service && barber) {
    return (
      <BookingSuccess
        appointmentId={confirmation.appointmentId}
        managementToken={confirmation.managementToken}
        barberName={barber.name}
        serviceName={service.name}
        durationMinutes={service.durationMinutes}
        price={service.price}
        slotIso={confirmation.slotIso}
        customerName={name}
        customerEmail={email}
        customerPhone={phone}
        labels={{
          title: t.confirmation.title,
          body: t.confirmation.body,
          reference: t.confirmation.reference,
          when: t.confirmation.when,
          with: t.confirmation.with,
          service: t.confirmation.service,
          duration: t.confirmation.duration,
          price: t.confirmation.price,
          name: t.manage.customerName,
          phone: t.manage.customerPhone,
          email: t.manage.customerEmail,
          addToCalendar: t.confirmation.addToCalendar,
          manage: t.confirmation.manageLink,
          bookAnother: t.confirmation.bookAnother,
          backHome: t.common.backHome,
          copyLink: t.confirmation.copyLink,
          copied: t.confirmation.copied,
          manageHint: t.confirmation.manageBody,
          minutes: t.common.minutes,
          birr: t.common.birr,
        }}
        dateNames={dateNames}
        onBookAnother={bookAnother}
        homeHref={localeHref(locale, "/")}
      />
    );
  }

  const stepLabels = {
    service: t.book.steps.service,
    barber: t.book.steps.barber,
    date: t.book.steps.date,
    time: t.book.steps.time,
    details: t.book.steps.details,
    confirm: t.book.steps.confirm,
  };

  const stepperSteps = [
    { label: stepLabels.service },
    { label: stepLabels.barber },
    { label: stepLabels.date },
    { label: stepLabels.time },
    { label: stepLabels.details },
    { label: stepLabels.confirm },
  ];

  const summaryLabels = {
    title: t.book.summary,
    barber: t.book.summaryBarber,
    service: t.book.summaryService,
    duration: t.book.summaryDuration,
    when: t.book.summaryWhen,
    price: t.confirmation.price,
    name: t.manage.customerName,
    phone: t.manage.customerPhone,
    email: t.manage.customerEmail,
    change: t.book.change,
    pickTime: t.book.pickTime,
    minutes: t.common.minutes,
    birr: t.common.birr,
  };

  return (
    <div className="grid gap-6 pb-4 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* Anchor so we can scroll the step indicator into view on navigation. */}
        <div ref={topRef} className="scroll-mt-20" />
        <StepIndicator
          steps={stepperSteps}
          current={step}
          furthest={furthestStep}
          onNavigate={goToStep}
          stepPrefix={t.book.stepPrefix}
          ariaLabel={t.book.stepAria}
        />

        {/* STEP 1 — Service */}
        {step === STEP.SERVICE && (
          <Card className="p-5 sm:p-6" aria-label={stepLabels.service}>
            <StepHeading
              index={1}
              title={t.book.chooseService}
              hint={t.book.serviceHint}
              prefix={t.book.stepPrefix}
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  selected={serviceId === s.id}
                  minutesLabel={t.common.minutes}
                  priceLabel={t.common.birr}
                  onSelect={() => {
                    setServiceId(s.id);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                  }}
                />
              ))}
            </div>
            <WizardNav
              showBack={false}
              backLabel={t.book.back}
              nextLabel={t.book.next}
              onNext={handleContinue}
              nextDisabled={!service}
            />
          </Card>
        )}


        {/* STEP 2 — Barber */}
        {step === STEP.BARBER && (
          <Card className="p-5 sm:p-6" aria-label={stepLabels.barber}>
            <StepHeading
              index={2}
              title={t.book.chooseBarber}
              hint={t.book.barberHint}
              prefix={t.book.stepPrefix}
            />
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
                      {barberId === b.id ? t.book.selected : t.book.available}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <WizardNav
              backLabel={t.book.back}
              nextLabel={t.book.next}
              onBack={handleBack}
              onNext={handleContinue}
              nextDisabled={!barber}
            />
          </Card>
        )}


        {/* STEP 3 — Date */}
        {step === STEP.DATE && (
          <Card className="p-4 sm:p-6" aria-label={stepLabels.date}>
            <StepHeading
              index={3}
              title={t.book.chooseDate}
              hint={t.book.dateHint}
              prefix={t.book.stepPrefix}
            />
            <div className="mt-4 space-y-4">
              <DayStripPicker
                days={days}
                slotsByDate={slotsByDate}
                closedDates={closedDates}
                value={selectedDate}
                todayKey={addisDateKey(Date.now())}
                labels={{
                  ...dateNames,
                  today: t.book.today,
                  closed: t.book.closed,
                  fullyBooked: t.book.fullyBooked,
                  ariaLabel: t.book.chooseDateAria,
                }}
                onSelect={(dateKey) => {
                  setSelectedDate(dateKey);
                  // Only drop the chosen time if it belongs to a different day —
                  // flipping between days must not silently lose the selection.
                  setSelectedSlot((current) =>
                    current && addisDateKey(Date.parse(current)) === dateKey
                      ? current
                      : null
                  );
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-xs text-cream-muted">
                  {selectedDate
                    ? `${t.book.timesFor} ${formatAddisDateLabel(selectedDate, dateNames)}`
                    : t.book.pickDayFirst}
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
                      ← {t.book.earlier}
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
                      {t.book.later} →
                    </button>
                  )}
                </div>
              </div>
            </div>
            <WizardNav
              backLabel={t.book.back}
              nextLabel={t.book.next}
              onBack={handleBack}
              onNext={handleContinue}
              nextDisabled={!selectedDate}
            />
          </Card>
        )}

        {/* STEP 4 — Time */}
        {step === STEP.TIME && (
          <Card className="p-4 sm:p-6" aria-label={stepLabels.time}>
            <StepHeading
              index={4}
              title={t.book.chooseTime}
              hint={t.book.timeHint}
              prefix={t.book.stepPrefix}
            />
            <div className="mt-4 space-y-3">
              <p className="text-sm text-cream-muted">
                {selectedDate
                  ? `${t.book.timesFor} ${formatAddisDateLabel(selectedDate, dateNames)}`
                  : t.book.pickDayFirst}
              </p>
              <div className="border-t border-line pt-4">
                <TimeSlotGrid
                  dateKey={selectedDate}
                  slots={selectedDate ? (slotsByDate[selectedDate] ?? []) : []}
                  takenSlots={selectedDate ? (takenByDate[selectedDate] ?? []) : []}
                  value={selectedSlot}
                  loading={availabilityLoading}
                  error={availabilityError}
                  onRetry={refreshAfterRejection}
                  onSelect={setSelectedSlot}
                  timeNames={dateNames}
                  labels={{
                    booked: t.book.slotBooked,
                    buffer: t.book.slotBuffer,
                    legendTaken: t.book.legendTaken,
                    legendBookedBuffer: t.book.legendBookedBuffer,
                    emptyTitle: t.book.pickDateTitle,
                    emptyBody: t.book.pickDateBody,
                    errorTitle: t.book.loadTimesFailed,
                    retry: t.common.tryAgain,
                    soldOutTitle: t.book.fullyBooked,
                    soldOutBody: t.book.noSlotsBody,
                    selectedAria: t.book.slotSelected,
                    availableAria: t.book.slotAvailable,
                  }}
                />
              </div>
            </div>
            <WizardNav
              backLabel={t.book.back}
              nextLabel={t.book.next}
              onBack={handleBack}
              onNext={handleContinue}
              nextDisabled={!selectedSlot || availabilityLoading}
            />
          </Card>
        )}


        {/* STEP 5 — Your details */}
        {step === STEP.DETAILS && (
          <Card className="p-5 sm:p-6" aria-label={stepLabels.details}>
            <StepHeading
              index={5}
              title={t.book.yourDetails}
              hint={t.book.detailsHint}
              prefix={t.book.stepPrefix}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                name="customer_name"
                label={t.book.name}
                placeholder={t.book.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    name: validateDetails().name,
                  }))
                }
                error={fieldErrors.name}
                autoComplete="name"
              />
              <Input
                name="customer_phone"
                label={t.book.phone}
                placeholder={t.book.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    phone: validateDetails().phone,
                  }))
                }
                error={fieldErrors.phone}
                autoComplete="tel"
                inputMode="tel"
              />
              <Input
                name="customer_email"
                label={t.book.email}
                type="email"
                placeholder={t.book.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: validateDetails().email,
                  }))
                }
                error={fieldErrors.email}
                autoComplete="email"
                className="sm:col-span-2"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-cream-muted">
              {t.book.detailsPrivacy}
            </p>
            <WizardNav
              backLabel={t.book.back}
              nextLabel={t.book.next}
              onBack={handleBack}
              onNext={handleContinue}
              nextDisabled={!detailsValid}
            />
          </Card>
        )}

        {/* STEP 6 — Confirm */}
        {step === STEP.CONFIRM && (
          <Card className="p-5 sm:p-6" aria-label={stepLabels.confirm}>
            <StepHeading
              index={6}
              title={t.book.confirmTitle}
              hint={t.book.confirmHint}
              prefix={t.book.stepPrefix}
            />
            <div className="mt-4">
              <BookingSummary
                embedded
                barberName={barber?.name ?? "—"}
                serviceName={service?.name ?? "—"}
                durationMinutes={service?.durationMinutes ?? 0}
                price={service?.price ?? "—"}
                slotIso={selectedSlot}
                customerName={name}
                customerPhone={phone}
                customerEmail={email}
                onEditService={() => goToStep(STEP.SERVICE)}
                onEditBarber={() => goToStep(STEP.BARBER)}
                onEditTime={() => goToStep(STEP.DATE)}
                onEditDetails={() => goToStep(STEP.DETAILS)}
                cancellationNote={t.book.cancellationNote}
                dateNames={dateNames}
                labels={summaryLabels}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-cream-muted">
              {t.book.confirmPolicy}
            </p>
            <WizardNav
              backLabel={t.book.back}
              nextLabel={t.book.confirm}
              onBack={handleBack}
              onNext={submit}
              nextLoading={submitting}
              nextDisabled={!service || !barber || !selectedSlot}
              error={submitError}
            />
          </Card>
        )}
      </div>

      {/* Desktop: sticky live summary sidebar */}
      <div className="hidden lg:block">
        <Card tone="raised" className="sticky top-20 p-6">
          <BookingSummary
            barberName={barber?.name ?? "—"}
            serviceName={service?.name ?? "—"}
            durationMinutes={service?.durationMinutes ?? 0}
            price={service?.price ?? "—"}
            slotIso={selectedSlot}
            cancellationNote={t.book.cancellationNote}
            dateNames={dateNames}
            labels={summaryLabels}
          />
        </Card>
      </div>
    </div>
  );
}

/** Numbered heading used at the top of each step card. */
function StepHeading({
  index,
  title,
  hint,
  prefix = "Step",
}: {
  index: number;
  title: string;
  hint?: string;
  /** Localized word for the screen-reader-only "Step N" prefix. */
  prefix?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-brass">
        <span className="sr-only">
          {prefix} {index}
        </span>
        <span aria-hidden="true">{index}</span>
      </p>
      <h2 className="mt-1 font-heading text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm leading-6 text-cream-muted">{hint}</p>}
    </div>
  );
}

/** Selectable service card: name, description, duration and price. */
function ServiceCard({
  service,
  selected,
  minutesLabel,
  priceLabel,
  onSelect,
}: {
  service: FlowService;
  selected: boolean;
  minutesLabel: string;
  priceLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-brass bg-brass/10"
          : "border-line bg-surface hover:border-brass/40"
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium">{service.name}</span>
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
            selected
              ? "border-brass bg-brass text-charcoal"
              : "border-line text-transparent"
          )}
          aria-hidden="true"
        >
          ✓
        </span>
      </span>
      {service.description && (
        <span className="mt-1 block text-xs leading-5 text-cream-muted">
          {service.description}
        </span>
      )}
      <span className="mt-2 flex items-center gap-2 text-xs text-cream-muted">
        <span>
          {service.durationMinutes} {minutesLabel}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-semibold text-brass-strong">
          {service.price ? `${service.price} ${priceLabel}` : "—"}
        </span>
      </span>
    </button>
  );
}

