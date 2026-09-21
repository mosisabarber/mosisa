"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_SHORT,
  LOCALES,
  alternateLocale,
  isLocale,
} from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Language switcher — a two-way EN ⇄ አማ toggle.
 *
 * Swaps the locale segment of the current path so the visitor stays on the
 * page they were reading, then records the choice in a cookie so the proxy
 * honours it on future un-prefixed visits.
 */
export function LanguageSwitcher({ t }: { t: Dictionary }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const segments = pathname.split("/");
  const current = isLocale(segments[1]) ? segments[1] : LOCALES[0];
  const next = alternateLocale(current);

  function switchTo(locale: string) {
    // Persist the choice for the proxy's un-prefixed redirect.
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${
      60 * 60 * 24 * 365
    };samesite=lax`;

    // `/en/services` → `/am/services`; keep deeper segments intact.
    const rest = segments.slice(2).join("/");
    const target = rest ? `/${locale}/${rest}` : `/${locale}`;
    startTransition(() => router.push(target));
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => switchTo(next)}
      title={t.langSwitcher.switchTo.replace(
        "{language}",
        LOCALE_LABELS[next]
      )}
      aria-label={t.langSwitcher.switchTo.replace(
        "{language}",
        LOCALE_LABELS[next]
      )}
      className={cn(
        "rounded-md border border-line px-2.5 py-1.5 text-xs font-medium tracking-wide transition-colors",
        "text-cream-muted hover:border-brass hover:text-brass-strong",
        pending && "opacity-60"
      )}
    >
      {LOCALE_SHORT[next]}
    </button>
  );
}
