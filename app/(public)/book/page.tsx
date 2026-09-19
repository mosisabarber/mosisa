import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { getActiveBarbers, getActiveServices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Book an appointment",
  description:
    "Book your cut at Mosisa Barber Shop — pick your barber, service, date and time in under a minute.",
};

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ barber?: string }>;
}

export default async function BookPage({ searchParams }: Props) {
  const { barber } = await searchParams;
  const [services, barbers] = await Promise.all([
    getActiveServices(),
    getActiveBarbers(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        Book your visit
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-cream-muted">
        Four quick steps: service, barber, time, and how to reach you. No
        account needed — you&apos;ll get a private link to manage your
        appointment.
      </p>

      <div className="mt-8">
        <BookingFlow
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
          }))}
          barbers={barbers.map((b) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
          }))}
          initialBarberSlug={barber ?? null}
        />
      </div>
    </main>
  );
}
