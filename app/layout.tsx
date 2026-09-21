import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serifDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-charcoal font-sans text-cream">
        {children}
      </body>
    </html>
  );
}
