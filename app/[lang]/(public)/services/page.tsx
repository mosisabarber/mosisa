import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, StateMessage } from "@/components/ui";
import { getActiveServices } from "@/lib/data";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeHref } from "@/lib/i18n/config";
import { formatTemplate } from "@/lib/i18n/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getDictionary(lang);
  const locale = getLocale(lang);
  return {
    title: t.services.title,
    description: `${t.services.subtitle} — ${t.meta.siteName}, ${t.meta.city}.`,
    alternates: {
      canonical: localeHref(locale, "/services"),
      languages: { en: "/en/services", am: "/am/services" },
    },
  };
}

// Services/hours are admin-editable DB content; refresh quickly.
export const revalidate = 60;

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const [services, t, locale] = await Promise.all([
    getActiveServices(),
    getDictionary(lang),
    getLocale(lang),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        {t.services.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-cream-muted">
        {t.services.subtitle}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {services.length === 0 ? (
          <Card>
            <StateMessage
              state="empty"
              title={t.services.empty}
              description={t.common.comingSoon}
            />
          </Card>
        ) : (
          services.map((service) => (
            <Card
              key={service.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <p className="font-medium">{service.name}</p>
                {service.description && (
                  <p className="mt-1 text-sm leading-6 text-cream-muted">
                    {service.description}
                  </p>
                )}
                <p className="mt-1.5 text-xs uppercase tracking-widest text-cream-muted">
                  {service.durationMinutes} {t.services.minutes}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <p className="font-heading text-xl font-semibold text-brass-strong">
                  {service.price} {t.common.birr}
                </p>
                <Link href={localeHref(locale, "/book")}>
                  <Button size="sm" variant="secondary">
                    {t.services.bookThis}
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
