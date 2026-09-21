import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * robots.txt (spec §14 / Stage 10).
 * - Public site: crawlable.
 * - /admin, /api, /manage: never indexed (admin is staff-only; manage links
 *   are private per-booking URLs that must not leak into search results).
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/manage/", "/manage"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
