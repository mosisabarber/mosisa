import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getWorkingHours } from "@/lib/data";
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
    title: t.contact.title,
    description: t.contact.subtitle,
    alternates: {
      canonical: localeHref(locale, "/contact"),
      languages: { en: "/en/contact", am: "/am/contact" },
    },
  };
}

export const revalidate = 60;

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const [hours, t] = await Promise.all([getWorkingHours(), getDictionary(lang)]);
  const dayNames = t.days.long;

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">
        {t.contact.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-cream-muted">
        {t.contact.subtitle}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            {t.contact.addressTitle}
          </p>
          <p className="mt-3 leading-7">
            {t.footer.address}
            <br />
            <span className="text-cream-muted">{t.contact.addressBody}</span>
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            {t.contact.phoneTitle}
          </p>
          <p className="mt-3 leading-7">
            <a
              href={`tel:${t.contact.phoneValue.replace(/\s/g, "")}`}
              className="text-brass hover:underline"
            >
              {t.contact.phoneValue}
            </a>
            <br />
            <span className="text-cream-muted">{t.contact.phoneBody}</span>
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            {t.contact.emailTitle}
          </p>
          <p className="mt-3 leading-7">
            <a
              href={`mailto:${t.contact.emailValue}`}
              className="break-all text-brass hover:underline"
            >
              {t.contact.emailValue}
            </a>
            <br />
            <span className="text-cream-muted">{t.contact.emailBody}</span>
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
          {t.contact.hoursTitle}
        </p>
        {hours.length === 0 ? (
          <p className="mt-3 text-sm text-cream-muted">
            {t.contact.hoursEmpty}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {hours.map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-cream-muted">
                  {dayNames[row.dayOfWeek]}
                </span>
                <span>
                  {formatTime(row.startTime)} – {formatTime(row.endTime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
