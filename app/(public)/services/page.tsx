import type { Metadata } from "next";
import { Card, StateMessage } from "@/components/ui";
import { getActiveServices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Cuts, beard trims and combos at Mosisa Barber Shop — fixed pricing, every barber.",
};

// Services/hours are admin-editable DB content; refresh quickly.
export const revalidate = 60;

export default async function ServicesPage() {
  const services = await getActiveServices();

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Services</h1>
      <p className="mt-3 text-sm leading-6 text-cream-muted">
        Fixed pricing across all barbers. Every appointment includes the full
        service time plus your barber's reset buffer, so the next guest never
        waits.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {services.length === 0 ? (
          <Card>
            <StateMessage
              state="empty"
              title="Menu coming soon"
              description="Our service list is being finalized. Check back shortly."
            />
          </Card>
        ) : (
          services.map((service) => (
            <Card
              key={service.id}
              className="flex items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-medium">{service.name}</p>
                {service.description && (
                  <p className="mt-1 text-sm leading-6 text-cream-muted">
                    {service.description}
                  </p>
                )}
                <p className="mt-1.5 text-xs uppercase tracking-widest text-cream-muted/70">
                  {service.durationMinutes} min
                </p>
              </div>
              <p className="shrink-0 font-heading text-xl font-semibold text-brass-strong">
                {service.price} Br
              </p>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
