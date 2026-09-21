/**
 * Locale configuration (AGENTS.md: the public site is bilingual — English and
 * Amharic). This module is the single source of truth for which locales exist
 * and how they are labelled; it must stay free of React/Next imports so the
 * proxy (edge runtime) can use it too.
 */

export const LOCALES = ["en", "am"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Cookie remembering the visitor's explicit choice from the language switcher.
 * The proxy prefers this over Accept-Language so a manual choice sticks.
 */
export const LOCALE_COOKIE = "mosisa_locale";

/** BCP-47 tags for <html lang> and og:locale. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  am: "am",
};

/** How each language names itself — shown in the switcher, never translated. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "አማርኛ",
};

/** Short code shown on the compact switcher button. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  am: "አማ",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** The other locale, for a simple two-way toggle. */
export function alternateLocale(locale: Locale): Locale {
  return locale === "en" ? "am" : "en";
}

/**
 * Prefix an app path with a locale, leaving already-localised URLs alone.
 * Pure / server-safe — used from `generateMetadata` (server) and from
 * `links.ts`'s client hook alike.
 */
export function localeHref(locale: Locale, path: string): string {
  // Hash-only or absolute links are passed through untouched.
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  // Already prefixed (`/am/book`) — don't double-prefix.
  const first = path.split("/")[1];
  if (isLocale(first)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Pick a locale from an `Accept-Language` header without pulling in a
 * dependency (the docs' example uses `negotiator`, but the grammar we care
 * about is small enough to parse here).
 *
 * Handles `am,en-US;q=0.9,en;q=0.8` and `*`. Returns DEFAULT_LOCALE when
 * nothing matches.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tagRaw = "", ...params] = part.trim().split(";");
      const tag = tagRaw.trim().toLowerCase();
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // Exact match, then the primary subtag (`am-ET` → `am`).
    if (isLocale(tag)) return tag;
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}
