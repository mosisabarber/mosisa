/**
 * Locale-aware label names for the date and clock helpers in
 * `lib/booking/time.ts`.
 *
 * A single object drives both labels, so every surface that shows a booking
 * date or time threads one prop instead of two: with `am` the date renders in
 * the Ethiopian calendar and the clock in the Ethiopian 6:00-based 12-hour
 * form, while `en` keeps Gregorian dates and 24-hour/AM-PM times.
 */
import type { DateLabelNames } from "@/lib/booking/time";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

export function localeNames(locale: Locale, t: Dictionary): DateLabelNames {
  return {
    weekdaysShort: t.days.short,
    monthsShort: t.months.short,
    ethiopian: locale === "am",
  };
}
