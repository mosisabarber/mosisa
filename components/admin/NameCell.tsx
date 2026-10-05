import type { Locale } from "@/lib/i18n/config";
import { pickLocalized } from "@/lib/i18n/content";

/**
 * Admin table/card name cell.
 *
 * Shows the name in the staff UI's own locale (English fallback), with the
 * other language underneath when it exists — so staff can spot an
 * untranslated service or barber at a glance without leaving the list.
 */
export function NameCell({
  locale,
  en,
  am,
}: {
  locale: Locale;
  en: string | null;
  am: string | null;
}) {
  const primary = pickLocalized(locale, en, am) ?? en ?? "";
  const secondary = locale === "am" ? en : am?.trim();
  const showSecondary = Boolean(secondary) && secondary !== primary;

  return (
    <>
      <span>{primary}</span>
      {showSecondary && (
        <span className="block text-xs text-cream-muted">{secondary}</span>
      )}
    </>
  );
}
