/**
 * Tiny class-name joiner — keeps us from adding clsx/tailwind-merge deps
 * while still allowing conditional/per-component class composition.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
