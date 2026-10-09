"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_TAGS,
  LOCALES,
  isLocale,
} from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Language switcher — a globe button that opens an English / አማርኛ dropdown.
 *
 * A disclosure (not a WAI-ARIA menu): the panel is toggled with aria-expanded
 * and its items are ordinary buttons, so Tab/Shift+Tab navigate them and no
 * arrow-key menu machinery is needed.
 *
 * Picking a language swaps the locale segment of the current path so the
 * visitor stays on the page they were reading, then records the choice in a
 * cookie so the proxy honours it on future un-prefixed visits.
 *
 * Used by both the public header (NavMenu) and the staff header, so the admin
 * area gets the same control for free.
 */
/**
 * Side effects of an explicit language choice: remember it for the proxy's
 * un-prefixed redirect (cookie) and flip `<html lang>` immediately — React
 * does not patch that attribute on a client-side navigation, and the Amharic
 * typography (`html[lang="am"]` in globals.css) hangs off it, so without this
 * the fonts would only switch on a full reload.
 * Kept at module scope so the mutations don't live in the component body
 * (react-hooks/immutability).
 */
function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${
    60 * 60 * 24 * 365
  };samesite=lax`;
  document.documentElement.lang = LOCALE_TAGS[locale];
}

export function LanguageSwitcher({ t }: { t: Dictionary }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const segments = pathname.split("/");
  const current = isLocale(segments[1]) ? segments[1] : LOCALES[0];

  // Dismiss the panel on outside click or Escape. The listeners exist only
  // while the panel is open; setState happens inside those handlers (event
  // time), never in the effect body.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchTo(locale: Locale) {
    setOpen(false);
    if (locale === current) return;

    // Remember the choice + flip <html lang> (see persistLocale).
    persistLocale(locale);

    // `/en/services` → `/am/services`; keep deeper segments intact.
    const rest = segments.slice(2).join("/");
    const target = rest ? `/${locale}/${rest}` : `/${locale}`;
    startTransition(() => router.push(target));
  }

  const triggerLabel = t.langSwitcher.label;

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={pending}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls="lang-menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-md border p-2 transition-colors",
          "border-line text-cream-muted hover:border-brass hover:text-brass-strong",
          open && "border-brass text-brass-strong",
          pending && "opacity-60"
        )}
      >
        {/* globe — world/language */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7.5" />
          <path d="M2.5 10h15" />
          <path d="M10 2.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5Z" />
        </svg>
      </button>

      {open && (
        <div
          id="lang-menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-md border border-line bg-surface py-1 shadow-xl"
        >
          {LOCALES.map((locale) => {
            const isCurrent = locale === current;
            return (
              <button
                key={locale}
                type="button"
                disabled={pending}
                aria-current={isCurrent ? "true" : undefined}
                title={t.langSwitcher.switchTo.replace(
                  "{language}",
                  LOCALE_LABELS[locale]
                )}
                onClick={() => switchTo(locale)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                  isCurrent
                    ? "text-brass-strong"
                    : "text-cream-muted hover:bg-surface-raised hover:text-cream"
                )}
              >
                <span>{LOCALE_LABELS[locale]}</span>
                {isCurrent && (
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 10.5 8 14.5 16 5.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
