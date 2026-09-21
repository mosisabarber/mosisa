"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocaleHref } from "@/lib/i18n/links";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Site header per spec §8: hamburger menu for secondary links, while
 * "Book Now" is a separate persistent button — always visible, never nested
 * inside the hamburger.
 *
 * Bilingual: labels come from the active dictionary, and every href is
 * prefixed with the current locale so navigation never drops the language.
 */
export function NavMenu({ t }: { t: Dictionary }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const href = useLocaleHref();

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/services", label: t.nav.services },
    { href: "/barbers", label: t.nav.barbers },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];

  // Close the menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isCurrent = (path: string) => pathname === href(path);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-charcoal/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href={href("/")}
          className="font-heading text-lg font-semibold tracking-wide text-cream"
        >
          Mosisa<span className="text-brass">.</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Desktop links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.href}
                href={href(link.href)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isCurrent(link.href)
                    ? "text-brass-strong"
                    : "text-cream-muted hover:text-cream"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <LanguageSwitcher t={t} />

          {/* Persistent Book Now — visible on every page, all breakpoints */}
          <Link href={href("/book")}>
            <Button size="sm">{t.nav.bookNow}</Button>
          </Link>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="rounded-md p-2 text-cream-muted hover:bg-surface hover:text-cream md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line bg-charcoal px-4 py-3 md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={href(link.href)}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm",
                isCurrent(link.href)
                  ? "bg-surface text-brass-strong"
                  : "text-cream-muted hover:bg-surface hover:text-cream"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
