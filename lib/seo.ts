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
