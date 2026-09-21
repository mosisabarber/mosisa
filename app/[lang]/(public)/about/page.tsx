import type { Metadata } from "next";
import { Card } from "@/components/ui";
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
    title: t.about.title,
    description: `${t.about.subtitle} — ${t.meta.siteName}.`,
    alternates: {
      canonical: localeHref(locale, "/about"),
      languages: { en: "/en/about", am: "/am/about" },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getDictionary(lang);

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        {t.about.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-cream-muted">
        {t.about.subtitle}
      </p>

      <Card className="mt-8 p-7">
        <h2 className="font-heading text-lg font-semibold text-brass-strong">
          {t.about.storyTitle}
        </h2>
        {t.about.storyBody.map((paragraph) => (
          <p key={paragraph} className="mt-4 leading-7 text-cream-muted">
            {paragraph}
          </p>
        ))}
      </Card>

      <h2 className="mt-10 font-heading text-xl font-semibold">
        {t.about.valuesTitle}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {t.about.values.map((item) => (
          <Card key={item.title} className="p-5">
            <p className="font-heading text-lg font-semibold text-brass-strong">
              {item.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-cream-muted">
              {item.body}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-7">
        <h2 className="font-heading text-lg font-semibold text-brass-strong">
          {t.about.cityTitle}
        </h2>
        <p className="mt-3 leading-7 text-cream-muted">{t.about.cityBody}</p>
      </Card>
    </main>
  );
}
