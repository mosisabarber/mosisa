import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { getActiveBarbers, getActiveServices } from "@/lib/data";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeHref } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getDictionary(lang);
  const locale = getLocale(lang);
  return {
    title: t.book.bookTitle,
    description: t.book.bookSubtitle,
    alternates: {
      canonical: localeHref(locale, "/book"),
      languages: { en: "/en/book", am: "/am/book" },
    },
  };
}

export const revalidate = 60;

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ barber?: string }>;
}

export default async function BookPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { barber } = await searchParams;
  const [services, barbers, t, locale] = await Promise.all([
    getActiveServices(),
    getActiveBarbers(),
    getDictionary(lang),
    getLocale(lang),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        {t.book.bookTitle}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-cream-muted">
        {t.book.bookSubtitle}
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
          dictionary={t}
          locale={locale}
        />
      </div>
    </main>
  );
}
