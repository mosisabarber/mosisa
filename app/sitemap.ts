import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { getActiveBarbers } from "@/lib/data";

/**
 * sitemap.xml (spec §14 / Stage 10): static pages + one URL per active barber.
 * Revalidated hourly; barber slugs come from the DB at build/runtime.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/barbers`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/book`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const barbers = await getActiveBarbers();
    const barberEntries: MetadataRoute.Sitemap = barbers.map((barber) => ({
      url: `${siteUrl}/barbers/${barber.slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticEntries, ...barberEntries];
  } catch {
    // DB unreachable at build time: ship the static set rather than failing.
    return staticEntries;
  }
}
