import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { getSiteUrl } from "@/lib/seo";
import {
  LOCALE_TAGS,
  LOCALES,
  isLocale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// NOTE: fonts are declared in the root layout (app/layout.tsx), which renders
// the single <html>. The Amharic local faces (Loga Comic, Ebrima) are applied
// via `html[lang="am"]` in globals.css.

const siteUrl = getSiteUrl();

/** Pre-render both locales at build time. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
    const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);

  return {
    // Anchors every relative og:image / canonical URL to an absolute origin.
    metadataBase: new URL(siteUrl),
    title: {
      default: t.meta.homeTitle,
      template: `%s — ${t.meta.siteName}`,
    },
    description: t.meta.homeDescription,
    applicationName: t.meta.siteName,
    // hreflang pair — each page adds its own canonical (see (public)/*/page.tsx).
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((locale) => [LOCALE_TAGS[locale], `/${locale}`])
      ),
    },
    openGraph: {
      type: "website",
      siteName: t.meta.siteName,
      locale: LOCALE_TAGS[lang],
      url: `${siteUrl}/${lang}`,
      title: t.meta.homeTitle,
      description: t.meta.homeOgDescription,
    },
    twitter: {
      card: "summary",
      title: t.meta.homeTitle,
      description: t.meta.homeTwitterDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { "max-image-preview": "large" },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0c0b",
};

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // Unknown /xx/ → 404 rather than rendering an untranslated page.
  if (!isLocale(lang)) notFound();

  // The single `<html>` (locale `lang` + font variables + theme-init script)
  // is rendered by the root layout, which reads `x-locale` from proxy.ts.
  // This layout must NOT render its own `<html>`/`<body>` — the browser only
  // honours the first one, so a nested duplicate would discard the locale
  // `lang` (breaking `html[lang="am"]`) and the font variables.
  return <>{children}</>;
}
