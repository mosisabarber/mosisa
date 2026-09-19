import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { ManageAppointment } from "@/components/manage/ManageAppointment";
import { getAppointmentByToken, isOpenForChanges } from "@/lib/booking/management";
import { classifyChange } from "@/lib/booking/lateness";
import { addisDateKey, formatAddisTime } from "@/lib/booking/time";

export const metadata: Metadata = {
  title: "Manage your appointment",
  description: "View, reschedule or cancel your appointment at Mosisa Barber Shop.",
  // Guest management links are private — keep them out of search engines.
  robots: { index: false, follow: false },
};

// Always fresh: the appointment's state and the 12-hour window both change.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ManagePage({ params }: Props) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);
  if (!appointment) notFound();

  const startMs = appointment.startDatetime.getTime();
  const change = classifyChange(appointment.startDatetime);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          Your appointment
        </h1>
        <p className="mt-3 text-sm leading-6 text-cream-muted">
          No account needed — this private link is how you manage your booking.
        </p>
      </div>

      <div className="mt-8">
        <ManageAppointment
          token={token}
          appointment={{
            appointment_id: appointment.id,
            status: appointment.status,
            customer_name: appointment.customerName,
            customer_phone: appointment.customerPhone,
            customer_email: appointment.customerEmail,
            start_datetime: appointment.startDatetime.toISOString(),
            end_datetime: appointment.endDatetime.toISOString(),
            display: {
              date_key: addisDateKey(startMs),
              start_time: formatAddisTime(startMs),
              end_time: formatAddisTime(appointment.endDatetime.getTime()),
              timezone: "Africa/Addis_Ababa",
            },
            barber: {
              id: appointment.barber.id,
              name: appointment.barber.name,
              slug: appointment.barber.slug,
            },
            service: {
              id: appointment.service.id,
              name: appointment.service.name,
              durationMinutes: appointment.service.durationMinutes,
              price: appointment.service.price,
            },
            can_change: isOpenForChanges(appointment.status),
            late_change: change.isLate,
            late_change_message: change.message,
          }}
        />
      </div>

      <Card className="mt-8">
        <h2 className="font-heading text-lg">Need to talk to us?</h2>
        <p className="mt-1.5 text-sm leading-6 text-cream-muted">
          If anything looks wrong, or you&apos;re running late, call the shop and
          we&apos;ll sort it out.
        </p>
        <div className="mt-3">
          <Link href="/contact">
            <Button variant="secondary" size="sm">
              Contact the shop
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}