import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";
import { LOCALE_TAGS, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

/**
 * Root layout — renders the SINGLE `<html>` document for every route.
 *
 * `app/[lang]/layout.tsx` must NOT render its own `<html>`/`<body>` (the
 * browser only honours the first one, which would discard the locale `lang`
 * and font variables). The locale comes from the `x-locale` request header set
 * by `proxy.ts`, so this root can render `lang={LOCALE_TAGS[locale]}` for the
 * `html[lang="am"]` rule in globals.css. /admin/* has no locale header →
 * falls back to `en`.
 *
 * Font variables: English faces (Geist/Playfair) always; the Amharic local
 * faces (Loga Comic, Ebrima) are declared here too so their `@font-face` +
 * variables exist on every page — globals.css only *applies* them under
 * `html[lang="am"]`, keeping English typography untouched.
 */
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
 * Amharic faces (headings → Loga Comic, body/UI → Ebrima) — applied via
 * `html[lang="am"]` in globals.css.
 *
 * PERF: `next/font/local` serves files AS-IS, so we self-host **WOFF2
 * subsets** instead of the original monolithic TTFs (Ebrima alone was
 * ~856 KB). Each face is split into a latin + an ethiopic subset with the
 * matching `unicode-range` in `declarations`, so:
 *   - Amharic pages download only the ethiopic subset (~144 KB for Ebrima,
 *     ~12 KB for Loga), not the full font;
 *   - English pages download none of it (the loader already only emits
 *     preload links for faces actually used by the rendered text).
 *
 * `preload: false` keeps these off the critical path — they only matter for
 * `html[lang="am"]`, and `display: "swap"` avoids invisible text. Fallback
 * to Google's Noto Ethiopic (in globals.css) covers any codepoint outside
 * these subsets.
 */
const logaComic = localFont({
  src: [
    { path: "../public/fonts/loga-comic-latin.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/loga-comic-ethiopic.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-loga-comic",
  display: "swap",
  preload: false,
  fallback: ["Noto Serif Ethiopic", "Georgia", "serif"],
});

const ebrima = localFont({
  src: [
    { path: "../public/fonts/ebrima-latin.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ebrima-ethiopic.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-ebrima",
  display: "swap",
  preload: false,
  fallback: ["Noto Sans Ethiopic", "system-ui", "sans-serif"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  // Anchors every relative og:image / canonical URL to an absolute origin.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mosisa Barber Shop — Classic Cuts in Harar",
    template: "%s — Mosisa Barber Shop",
  },
  description:
    "Classic cuts, honest craft. Book your next appointment at Mosisa Barber Shop — Harar.",
  applicationName: "Mosisa Barber Shop",
  // NOTE: no root-level `alternates.canonical` — a root canonical ("/") is
  // inherited by every child page, which would tell search engines that
  // /services, /barbers etc. are all copies of the homepage. Instead each
  // page sets its own canonical (see app/(public)/*/page.tsx).
  openGraph: {
    type: "website",
    siteName: "Mosisa Barber Shop",
    locale: "en_US",
    url: siteUrl,
    title: "Mosisa Barber Shop — Classic Cuts in Harar",
    description:
      "A traditional barbershop with modern service. Pick your barber, pick your time, and your chair is reserved before you arrive.",
  },
  twitter: {
    card: "summary",
    title: "Mosisa Barber Shop — Classic Cuts in Harar",
    description:
      "A traditional barbershop with modern service. Book online in under a minute.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0b",
};

/**
 * Renders the single `<html>` for every route. The locale is read from the
 * `x-locale` header set by proxy.ts (absent on /admin/* → defaults to `en`).
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const rawLocale = h.get("x-locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  /**
   * Pre-paint theme init: restore the user's stored theme before the first
   * render so light-mode visitors never see a dark flash. Blocking inline
   * script on purpose — it must run before the body paints. Dark is default.
   */
  const themeInit = `(function(){try{var s=localStorage.getItem("mosisa_theme");if(s==="light"){document.documentElement.classList.add("light")}}catch(e){}})();`;

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${geistSans.variable} ${geistMono.variable} ${serifDisplay.variable} ${logaComic.variable} ${ebrima.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-full flex-col bg-charcoal font-sans text-cream">
        {children}
      </body>
    </html>
  );
}
