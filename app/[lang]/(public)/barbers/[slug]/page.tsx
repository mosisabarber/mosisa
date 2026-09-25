import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { getActiveBarbers, getBarberBySlug } from "@/lib/data";
import { getSiteUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const barber = await getBarberBySlug(decodedSlug);
  if (!barber) return { title: "Barber not found" };
  return {
    title: `${barber.name} — Barber`,
    description:
      barber.bio?.slice(0, 150) ??
      `Book an appointment with ${barber.name} at Mosisa Barber Shop.`,
    alternates: { canonical: `/barbers/${barber.slug}` },
    openGraph: {
      title: `${barber.name} — Mosisa Barber Shop`,
      description:
        barber.bio?.slice(0, 200) ??
        `Book an appointment with ${barber.name}.`,
      type: "profile",
      url: `/barbers/${barber.slug}`,
      images: barber.photoUrl ? [{ url: barber.photoUrl }] : undefined,
    },
  };
}

export default async function BarberPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const barber = await getBarberBySlug(decodedSlug);
  if (!barber) notFound();

  const others = (await getActiveBarbers()).filter((b) => b.id !== barber.id);
  const siteUrl = getSiteUrl();

  // JSON-LD: Person + BreadcrumbList (spec §14 — rich results for barber pages)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Barbers",
            item: `${siteUrl}/barbers`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: barber.name,
            item: `${siteUrl}/barbers/${barber.slug}`,
          },
        ],
      },
      {
        "@type": "Person",
        name: barber.name,
        url: `${siteUrl}/barbers/${barber.slug}`,
        description: barber.bio ?? undefined,
        image: barber.photoUrl ?? undefined,
        jobTitle: "Barber",
        worksFor: {
          "@type": "HairSalon",
          name: "Mosisa Barber Shop",
          url: siteUrl,
        },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <script
        type="application/ld+json"
        // JSON.stringify output is escaped here (not v-html) so a bio containing
        // `</script>` cannot break out of the JSON-LD script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        <div>
          <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border border-line bg-gradient-to-br from-forest/40 via-navy/30 to-surface-raised">
            {barber.photoUrl ? (
              <Image
                src={barber.photoUrl}
                alt={`Portrait of ${barber.name}, barber at Mosisa Barber Shop`}
                fill
                sizes="(min-width: 768px) 320px, 100vw"
                quality={90}
                priority
                className="object-cover"
              />
            ) : (
              <span className="font-heading text-7xl font-semibold text-brass/80">
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
              <p className="text-sm italic text-cream-muted">
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
