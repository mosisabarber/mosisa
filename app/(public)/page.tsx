import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { BarberCard } from "@/components/barbers/BarberCard";
import {
  getActiveBarbers,
  getActiveServices,
  getWorkingHours,
} from "@/lib/data";

export const revalidate = 60;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function HomePage() {
  const [barbers, services, hours] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getWorkingHours(),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 bg-gradient-to-b from-forest/25 via-navy/15 to-charcoal"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brass">
            Addis Ababa · Walk-ins & online booking
          </p>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-6xl">
            Classic cuts.
            <br />
            <span className="text-brass-strong">Honest craft.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
            A traditional barbershop with modern service. Pick your barber, pick
            your time, and your chair is reserved before you arrive.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/book">
              <Button size="lg" fullWidth>
                Book Now
              </Button>
            </Link>
            <Link href="/barbers">
              <Button size="lg" variant="secondary" fullWidth>
                Meet the Barbers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
            Services & pricing
          </h2>
          <Link
            href="/services"
            className="text-sm text-brass-strong hover:text-brass"
          >
            All services →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-cream-muted">
              Service menu coming soon.
            </Card>
          ) : (
            services.slice(0, 3).map((service) => (
              <Card
                key={service.id}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="mt-1 text-sm text-cream-muted">
                    {service.durationMinutes} min
                  </p>
                </div>
                <p className="font-heading text-lg font-semibold text-brass-strong">
                  {service.price} Br
                </p>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Barbers preview — barber reputation is the growth driver (§1) */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="flex items-end justify-between">
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
              The barbers
            </h2>
            <Link
              href="/barbers"
              className="text-sm text-brass-strong hover:text-brass"
            >
              All barbers →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.length === 0 ? (
              <Card className="col-span-full p-8 text-center text-cream-muted">
                Barber profiles coming soon.
              </Card>
            ) : (
              barbers.slice(0, 3).map((barber) => (
                <BarberCard key={barber.id} barber={barber} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Hours strip */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
          Opening hours
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {hours.length === 0 ? (
            <p className="col-span-full text-sm text-cream-muted">
              Open daily — exact hours posted soon.
            </p>
          ) : (
            hours.map((row) => (
              <Card key={row.id} className="px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-widest text-cream-muted">
                  {DAY_NAMES[row.dayOfWeek]}
                </p>
                <p className="mt-1 text-sm text-cream">
                  {formatTime(row.startTime)}
                </p>
                <p className="text-sm text-cream-muted">
                  until {formatTime(row.endTime)}
                </p>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
