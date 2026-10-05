/**
 * Locale resolution for admin-editable content (service/barber names and other
 * customer-facing text).
 *
 * Staff can enter an Amharic version alongside the English one. Those columns
 * are nullable on purpose: when Amharic is missing (or blank) the English value
 * is shown, so the site never renders an empty label and staff can translate
 * gradually.
 *
 * Server-safe — no React/Next imports, so Server Components, data loaders and
 * route handlers can all use it.
 */
import type { Locale } from "./config";

/** Pick the Amharic value when one exists for `am`, otherwise the English one. */
export function pickLocalized(
  locale: Locale,
  en: string | null | undefined,
  am: string | null | undefined
): string | null {
  if (locale === "am") {
    const translated = am?.trim();
    if (translated) return translated;
  }
  return en ?? null;
}

/** `pickLocalized` for list fields (e.g. a barber's specialties). */
export function pickLocalizedList(
  locale: Locale,
  en: string[] | null | undefined,
  am: string[] | null | undefined
): string[] {
  if (locale === "am" && am && am.length > 0) return am;
  return en ?? [];
}
