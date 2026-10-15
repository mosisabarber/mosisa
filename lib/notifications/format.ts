/**
 * Greeting helper for customer notifications (AGENTS.md §7).
 *
 * Messages open with "Dear <name>" using only the FIRST word the customer
 * typed, so "Dawit Tesfaye" greets as "Dear Dawit" — more personal in SMS,
 * where the full name would eat a third of a Unicode segment.
 * `customer_name` is trimmed/min-length-2 by the booking schema, so the
 * first word is always present.
 */
export function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}
