/**
 * Tiny `{placeholder}` interpolation for dictionary strings.
 *
 * Kept dependency-free and locale-agnostic: translators control word order by
 * moving the `{name}` token, so we never concatenate fragments in the UI.
 *
 *   formatTemplate(t.barbers.bookWith, { name: "Mosisa" })
 *   // → "Book with Mosisa"  /  "ከሞሲሳ ጋር ያስይዙ"
 *
 * Unknown tokens are left untouched (visible in QA rather than blanked out).
 */
export function formatTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
