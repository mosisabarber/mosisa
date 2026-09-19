import type { Metadata } from "next";
import { Card, StateMessage } from "@/components/ui";
import { BarberCard } from "@/components/barbers/BarberCard";
import { getActiveBarbers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Barbers",
  description:
    "Meet the barbers of Mosisa Barber Shop — pick your barber and book directly with them.",
};

export const revalidate = 60;

export default async function BarbersPage() {
  const barbers = await getActiveBarbers();

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        The barbers
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-cream-muted">
        Book with the barber whose work you've seen. Each has their own chair,
        schedule, and portfolio.
      </p>

      {barbers.length === 0 ? (
        <Card className="mt-8">
          <StateMessage
            state="empty"
            title="Profiles coming soon"
            description="Our barbers' profiles are being set up. Check back shortly."
          />
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <BarberCard key={barber.id} barber={barber} />
          ))}
        </div>
      )}
    </main>
  );
}
