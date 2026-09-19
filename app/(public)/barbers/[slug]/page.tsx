import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { getActiveBarbers, getBarberBySlug } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) return { title: "Barber not found" };
  return {
    title: barber.name,
    description:
      barber.bio?.slice(0, 150) ??
      `Book an appointment with ${barber.name} at Mosisa Barber Shop.`,
  };
}

export default async function BarberPage({ params }: Props) {
  const { slug } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) notFound();

  const others = (await getActiveBarbers()).filter((b) => b.id !== barber.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        <div>
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-line bg-gradient-to-br from-forest/40 via-navy/30 to-surface-raised">
            {barber.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={barber.photoUrl}
                alt={barber.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-heading text-7xl font-semibold text-brass/60">
                {barber.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            )}
          </div>

          <Link href={`/book?barber=${barber.slug}`} className="mt-4 block">
            <Button fullWidth>Book with {barber.name.split(" ")[0]}</Button>
          </Link>
        </div>

        <div>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {barber.name}
          </h1>

          {barber.specialties && barber.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {barber.specialties.map((specialty) => (
                <Badge key={specialty} tone="forest">
                  {specialty}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-line pt-5">
            {barber.bio ? (
              <p className="whitespace-pre-line leading-7 text-cream-muted">
                {barber.bio}
              </p>
            ) : (
              <p className="text-sm italic text-cream-muted/60">
                Profile coming soon.
              </p>
            )}
          </div>

          {others.length > 0 && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
                Other barbers
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {others.map((other) => (
                  <Link key={other.id} href={`/barbers/${other.slug}`}>
                    <Button variant="ghost" size="sm">
                      {other.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
