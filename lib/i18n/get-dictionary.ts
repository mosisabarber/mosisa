/**
 * Dictionary loader (Next 16 i18n guide): `lang` comes from the `[lang]`
 * route segment. Every caller under `app/[lang]/...` already has `lang` in
 * its `params`, so it passes it explicitly here.
 *
 * Why not `next/root-params`' `lang()`? In Next 16.3.5 on this machine
 * `next/root-params` is a placeholder module with no exports at build time,
 * and `useParams` (the alternative) is client-only — but these loaders run in
 * Server Components. Reading `lang` from the route params is the stable path.
 */
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  am: () => import("./dictionaries/am").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  if (!isLocale(locale)) notFound();
  return dictionaries[locale]();
}

/** Current locale as read from the route segment (server-side only). */
export function getLocale(locale: string): Locale {
  return isLocale(locale) ? locale : "en";
}
