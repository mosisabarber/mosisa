import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Ethiopic,
  Noto_Serif_Ethiopic,
  Playfair_Display,
} from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getSiteUrl } from "@/lib/seo";
import {
  LOCALE_TAGS,
  LOCALES,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-sans-mono",
  subsets: ["latin"],
});

const serifDisplay = Playfair_Display({
  variable: "--font-serif-display",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Ethiopic faces. Geist/Playfair have no Ethiopic glyphs, so Amharic would
 * fall back to whatever the OS has — or tofu. Both Noto Ethiopic families are
 * declared here and appended to the font stack for `[lang="am"]` in
 * globals.css, so English typography is untouched.
 */
const ethiopicSans = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic-sans",
  subsets: ["ethiopic"],
  display: "swap",
});

const ethiopicSerif = Noto_Serif_Ethiopic({
  variable: "--font-ethiopic-serif",
  subsets: ["ethiopic"],
  display: "swap",
});

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

  const locale: Locale = lang;

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${geistSans.variable} ${geistMono.variable} ${serifDisplay.variable} ${ethiopicSans.variable} ${ethiopicSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-charcoal font-sans text-cream">
        {children}
      </body>
    </html>
  );
}
