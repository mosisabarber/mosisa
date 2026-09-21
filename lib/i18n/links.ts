/**
 * Locale-aware link helpers.
 *
 * Public routes live under `/{locale}/...`, so hardcoding `href="/book"` would
 * bounce the visitor through the proxy and lose their chosen language.
 *
 * Two flavours:
 *   - `localeHref(locale, "/book")`  — server components & anything that
 *     already knows the locale from the route segment.
 *   - `useLocaleHref()`              — client components, which read the
 *     locale from the URL segment they are rendered under.
 */
"use client";

import { useParams } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/** Prefix an app path with a locale, leaving already-localised URLs alone. */
export function localeHref(locale: Locale, path: string): string {
  // Hash-only or absolute links are passed through untouched.
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  // Already prefixed (`/am/book`) — don't double-prefix.
  const first = path.split("/")[1];
  if (isLocale(first)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Client-side hook: returns a `href()` bound to the locale of the current
 * route. Safe when rendered outside `/[lang]` (falls back to the default).
 */
export function useLocaleHref(): (path: string) => string {
  const params = useParams<{ lang?: string }>();
  const locale: Locale = isLocale(params?.lang) ? params.lang : DEFAULT_LOCALE;
  return (path: string) => localeHref(locale, path);
}
