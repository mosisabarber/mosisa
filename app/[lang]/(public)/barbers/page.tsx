import type { Metadata } from "next";
import { Card, StateMessage } from "@/components/ui";
import { BarberCard } from "@/components/barbers/BarberCard";
import { getActiveBarbers } from "@/lib/data";
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
    title: t.barbers.title,
    description: t.barbers.subtitle,
    alternates: {
      canonical: localeHref(locale, "/barbers"),
      languages: { en: "/en/barbers", am: "/am/barbers" },
    },
  };
}

export const revalidate = 60;

export default async function BarbersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const [barbers, t, locale] = await Promise.all([
    getActiveBarbers(),
    getDictionary(lang),
    getLocale(lang),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        {t.barbers.title}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-cream-muted">
        {t.barbers.subtitle}
      </p>

      {barbers.length === 0 ? (
        <Card className="mt-8">
          <StateMessage state="empty" title={t.barbers.empty} />
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <BarberCard
              key={barber.id}
              barber={barber}
              ctaLabel={t.barbers.viewProfile}
              href={localeHref(locale, `/barbers/${barber.slug}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
