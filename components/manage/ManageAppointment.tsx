"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Modal, StateMessage } from "@/components/ui";
import { DayStripPicker } from "@/components/booking/DayStripPicker";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import { LateChangeWarning } from "./LateChangeWarning";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";
import { localeHref } from "@/lib/i18n/links";
import { formatTemplate } from "@/lib/i18n/format";

export interface ManagedAppointmentView {
  appointment_id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  start_datetime: string;
  end_datetime: string;
  display: {
    date_key: string;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  barber: { id: string; name: string; slug: string };
  service: { id: string; name: string; durationMinutes: number; price: string };
  can_change: boolean;
  late_change: boolean;
  late_change_message: string;
}

export interface ManageAppointmentProps {
  token: string;
  appointment: ManagedAppointmentView;
  dictionary: Dictionary;
  locale: Locale;
}

type Mode = "view" | "reschedule";

/** Addis "today" as YYYY-MM-DD (UTC+3, no DST in Ethiopia). */
function addisTodayKey(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function addisPlusDaysKey(days: number): string {
  return new Date(Date.now() + 3 * 3600 * 1000 + days * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Guest appointment management (Â§7 `/manage/[token]`): view, reschedule and
 * cancel. The 12-hour rule is a soft warning only â€” every action stays enabled.
 */
export function ManageAppointment({
  token,
  appointment: initial,
  dictionary: t,
  locale,
}: ManageAppointmentProps) {
  const [appointment, setAppointment] = useState(initial);
  const [mode, setMode] = useState<Mode>("view");
  const booksHref = localeHref(locale, "/book");

  // Reschedule state
  const [days, setDays] = useState<string[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Action state
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cancelled = appointment.status === "cancelled";

  /* ------------------------------ availability ----------------------------- */

  async function loadAvailability() {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const params = new URLSearchParams({
        barber_id: appointment.barber.id,
        service_id: appointment.service.id,
        start_date: addisTodayKey(),
        end_date: addisPlusDaysKey(13),
      });
      const res = await fetch(
        `/api/booking/availability?${params.toString()}`,
        { cache: "no-store" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        days?: { date: string; slots: string[] }[];
        message?: string;
      };
      if (!res.ok) {
        setSlotsError(body.message ?? t.manage.loadTimesFailedBody);
        return;
      }
      const nextDays = body.days ?? [];
      setDays(nextDays.map((d) => d.date));
      setSlotsByDate(
        Object.fromEntries(nextDays.map((d) => [d.date, d.slots]))
      );
    } catch {
      setSlotsError(t.manage.networkError);
    } finally {
      setLoadingSlots(false);
    }
  }

  function startReschedule() {
    setMode("reschedule");
    setActionError(null);
    setSuccessMessage(null);
    setSelectedSlot(null);
    if (days.length === 0) void loadAvailability();
  }

  async function submitReschedule() {
    if (!selectedSlot) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          management_token: token,
          start_datetime: selectedSlot,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        late_change?: boolean;
        appointment?: ManagedAppointmentView;
      };

      if (!res.ok) {
        setActionError(
          body.message ??
            (body.error === "slot_no_longer_available"
              ? t.book.errors.slotTaken
              : t.manage.rescheduleFailed)
        );
        if (body.error === "slot_no_longer_available") {
          void loadAvailability(); // the grid is now stale â€” refresh it
        }
        return;
      }

      if (body.appointment) setAppointment(body.appointment);
      setMode("view");
      setSuccessMessage(body.late_change ? t.manage.movedLate : t.manage.movedBody);
    } catch {
      setActionError(t.manage.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function submitCancel() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ management_token: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setActionError(body.message ?? t.manage.cancelFailed);
        return;
      }
      setAppointment({
        ...appointment,
        status: "cancelled",
        can_change: false,
      });
      setConfirmCancel(false);
      setMode("view");
      setSuccessMessage(t.manage.cancelledBody);
    } catch {
      setActionError(t.manage.networkError);
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------- view --------------------------------- */

  return (
    <div className="grid gap-4">
      {successMessage && (
        <StateMessage state="success" description={successMessage} />
      )}

      {!cancelled && appointment.late_change && (
        <LateChangeWarning message={appointment.late_change_message} />
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl">{appointment.service.name}</h2>
            <p className="mt-0.5 text-sm text-cream-muted">
              {t.manage.with} {appointment.barber.name}
            </p>
          </div>
          <Badge
            tone={
              cancelled
                ? "error"
                : appointment.late_change
                  ? "warning"
                  : "forest"
            }
          >
            {cancelled ? t.manage.cancelled : t.manage.confirmed}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
          <Row label={t.manage.when} value={appointment.display.date_key} />
          <Row
            label={t.manage.time}
            value={`${appointment.display.start_time} â€“ ${appointment.display.end_time}`}
          />
          <Row
            label={t.manage.dur}
            value={`${appointment.service.durationMinutes} ${t.common.minutes}`}
          />
          <Row
            label={t.manage.price}
            value={`${appointment.service.price} ${t.common.birr}`}
          />
          <Row label={t.manage.customerName} value={appointment.customer_name} />
          <Row label={t.manage.customerPhone} value={appointment.customer_phone} />
          <Row label={t.manage.customerEmail} value={appointment.customer_email} />
        </dl>

        <p className="mt-3 text-xs text-cream-muted">
          {formatTemplate(t.manage.timesInTimezone, {
            place: t.meta.city,
            timezone: appointment.display.timezone,
          })}
        </p>

        {actionError && (
          <p className="mt-3 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {actionError}
          </p>
        )}

        {cancelled ? (
          <div className="mt-4">
            <Link href={booksHref}>
              <Button className="w-full">{t.manage.bookAgain}</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={
                mode === "reschedule" ? () => setMode("view") : startReschedule
              }
              disabled={busy}
            >
              {mode === "reschedule"
                ? t.manage.stopRescheduling
                : t.manage.reschedule}
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
            >
              {t.manage.cancelAction}
            </Button>
          </div>
        )}
      </Card>

      {mode === "reschedule" && !cancelled && (
        <Card>
          <h3 className="font-heading text-lg">{t.manage.rescheduleTitle}</h3>
          <p className="mt-1 text-sm text-cream-muted">
            {t.manage.rescheduleBody2}
          </p>

          <div className="mt-4">
            {days.length === 0 && loadingSlots ? (
              <StateMessage state="loading" className="py-8" />
            ) : days.length === 0 && slotsError ? (
              <StateMessage
                state="error"
                title={t.manage.loadTimesFailed}
                description={slotsError}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={loadAvailability}
                  >
                    {t.common.tryAgain}
                  </Button>
                }
              />
            ) : (
              <DayStripPicker
                days={days}
                slotsByDate={slotsByDate}
                value={selectedDate}
                onSelect={(key) => {
                  setSelectedDate(key);
                  setSelectedSlot(null);
                }}
                disabled={loadingSlots}
                todayKey={addisTodayKey()}
              />
            )}
          </div>

          {selectedDate && (
            <div className="mt-4">
              <TimeSlotGrid
                dateKey={selectedDate}
                slots={slotsByDate[selectedDate] ?? []}
                value={selectedSlot}
                onSelect={setSelectedSlot}
                loading={loadingSlots}
                error={slotsError}
                onRetry={loadAvailability}
              />
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => void loadAvailability()}
              disabled={loadingSlots || busy}
            >
              {t.manage.refreshTimes}
            </Button>
            <Button
              onClick={() => void submitReschedule()}
              loading={busy}
              disabled={!selectedSlot || loadingSlots}
            >
              {t.manage.confirmNewTime}
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={t.manage.cancelTitle}
      >
        <p className="text-sm leading-6 text-cream-muted">
          {formatTemplate(t.manage.summaryLine, {
            service: appointment.service.name,
            barber: appointment.barber.name,
            date: appointment.display.date_key,
            time: appointment.display.start_time,
          })}
        </p>

        {appointment.late_change && (
          <div className="mt-3">
            <LateChangeWarning
              message={appointment.late_change_message}
              tone="info"
            />
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            {t.manage.cancelKeep}
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => void submitCancel()}
          >
            Yes, cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cream-muted">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
