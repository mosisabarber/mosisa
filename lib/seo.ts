/**
 * Shared SEO helpers (Stage 10 / spec §14).
 *
 * The canonical site URL comes from NEXT_PUBLIC_SITE_URL (set in .env.local
 * and on Vercel) so metadataBase, sitemap URLs and JSON-LD all agree in every
 * environment. Falling back to localhost keeps local builds deterministic.
 */
const FALLBACK = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK;
  // Normalize: no trailing slash, so `${siteUrl}/path` never doubles up.
  return raw.replace(/\/+$/, "");
}

/**
 * Origin used for links inside customer notifications (SMS/email) — the
 * manage link is often the ONLY way a guest can reach their booking, so it
 * must never come out empty or relative.
 *
 * NEXT_PUBLIC_SITE_URL wins (https://mosisabarber.com in production). If it
 * is missing in some environment, fall back to the origin the request
 * actually arrived on (x-forwarded-* is what Vercel sets), instead of
 * silently emitting a broken link.
 */
export function notificationSiteUrl(request: Request): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return FALLBACK;
}

/** Business constants shared by JSON-LD and the contact page. */
export const BUSINESS = {
  name: "Mosisa Barber Shop",
  city: "Harar",
  country: "Ethiopia",
  /** @type const — PostalAddress without a street yet (contact page is explicit). */
  address: {
    "@type": "PostalAddress",
    addressLocality: "Harar",
    addressCountry: "ET",
  },
} as const;
