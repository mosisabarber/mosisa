import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { BarberCard } from "@/components/barbers/BarberCard";
import {
  getActiveBarbers,
  getActiveServices,
  getWorkingHours,
} from "@/lib/data";
import { BUSINESS, getSiteUrl } from "@/lib/seo";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeHref } from "@/lib/i18n/config";
import { formatTemplate } from "@/lib/i18n/format";

export const revalidate = 60;

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Schema.org HairSalon — rich-result facts for the homepage (spec §14). */
function hairSalonJsonLd(openingHours: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  const siteUrl = getSiteUrl();
  const DAY_URIS = [
    "https://schema.org/Sunday",
    "https://schema.org/Monday",
    "https://schema.org/Tuesday",
    "https://schema.org/Wednesday",
    "https://schema.org/Thursday",
    "https://schema.org/Friday",
    "https://schema.org/Saturday",
  ];
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: BUSINESS.name,
    url: siteUrl,
    telephone: "+251-91-003-4055",
    image: `${siteUrl}/og.png`,
    address: BUSINESS.address,
    priceRange: "$$",
    currenciesAccepted: "ETB",
    openingHoursSpecification: openingHours.map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_URIS[row.dayOfWeek],
      opens: row.startTime.length >= 5 ? row.startTime.slice(0, 5) : row.startTime,
      closes: row.endTime.length >= 5 ? row.endTime.slice(0, 5) : row.endTime,
    })),
  };
}

export interface Props {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  const [barbers, services, hours, t, locale] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getWorkingHours(),
    getDictionary(lang),
    getLocale(lang),
  ]);
  const href = (path: string) => localeHref(locale, path);

  return (
    <main>
      <script
        type="application/ld+json"
        // Static, trusted data only — no user input is interpolated here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hairSalonJsonLd(hours)) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 bg-gradient-to-b from-forest/25 via-navy/15 to-charcoal"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brass">
            {t.home.heroEyebrowShort}
          </p>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-6xl">
            {t.home.heroTitleTop}
            <br />
            <span className="text-brass-strong">{t.home.heroTitleBottom}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={href("/book")}>
              <Button size="lg" fullWidth>
                {t.home.heroPrimaryCta}
              </Button>
            </Link>
            <Link href={href("/barbers")}>
              <Button size="lg" variant="secondary" fullWidth>
                {t.nav.barbers}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
            {t.home.servicesTitle}
          </h2>
          <Link
            href={href("/services")}
            className="text-sm text-brass-strong hover:text-brass"
          >
            {t.home.servicesCta} →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-cream-muted">
              {t.home.servicesEmpty}
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
                    {service.durationMinutes} {t.common.minutes}
                  </p>
                </div>
                <p className="font-heading text-lg font-semibold text-brass-strong">
                  {service.price} {t.common.birr}
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
              {t.home.barbersTitle}
            </h2>
            <Link
              href={href("/barbers")}
              className="text-sm text-brass-strong hover:text-brass"
            >
              {t.home.barbersCta} →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.length === 0 ? (
              <Card className="col-span-full p-8 text-center text-cream-muted">
                {t.home.barbersEmpty}
              </Card>
            ) : (
              barbers.slice(0, 3).map((barber) => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  ctaLabel={t.barbers.viewProfile}
                  href={href(`/barbers/${barber.slug}`)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Hours strip */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
          {t.home.hoursTitle}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {hours.length === 0 ? (
            <p className="col-span-full text-sm text-cream-muted">
              {t.common.openDailySoon}
            </p>
          ) : (
            hours.map((row) => (
              <Card key={row.id} className="px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-widest text-cream-muted">
                  {t.days.short[row.dayOfWeek]}
                </p>
                <p className="mt-1 text-sm text-cream">
                  {formatTime(row.startTime)}
                </p>
                <p className="text-sm text-cream-muted">
                  {formatTemplate(t.home.hoursUntil, {
                    time: formatTime(row.endTime),
                  })}
                </p>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
