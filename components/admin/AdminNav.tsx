/**
 * Navigation for the admin dashboard (AGENTS.md §6 / Stage 8).
 * Mirrors the public NavMenu's brass/cream styling: a fixed sidebar from `md`
 * up, and a hamburger + dropdown panel below `md` so phones are never left
 * without navigation.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useLocaleHref } from "@/lib/i18n/links";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type AdminNavT = Dictionary["admin"]["nav"];

export function AdminNav({ t }: { t: AdminNavT }) {
  const pathname = usePathname();
  const href = useLocaleHref();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/admin", label: t.dashboard },
    { href: "/admin/appointments", label: t.appointments },
    { href: "/admin/services", label: t.services },
    { href: "/admin/barbers", label: t.barbers },
    { href: "/admin/hours", label: t.hours },
    { href: "/admin/blocked-times", label: t.blockedTimes },
  ];

  // The mobile menu closes on navigation via each link's onClick (below) rather
  // than an effect watching `pathname` — setState inside an effect causes
  // cascading renders (react-hooks/set-state-in-effect), same as NavMenu.
  // `href()` prefixes the locale, so comparing the prefixed pathname against it
  // stays correct for both `/en/admin` and `/am/admin`.
  const isCurrent = (path: string) => pathname === href(path);

  return (
    <>
      {/* Mobile: hamburger toggle (hidden from `md` up, where the sidebar shows) */}
      <div className="md:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5 text-sm font-medium text-cream"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? t.closeMenu : t.openMenu}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{links.find((l) => isCurrent(l.href))?.label ?? t.menu}</span>
          <svg
            className="h-5 w-5 text-cream-muted"
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

        {open && (
          <nav
            id="admin-mobile-nav"
            aria-label={t.aria}
            className="mt-2 flex flex-col gap-1 rounded-md border border-line bg-surface p-2"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={href(link.href)}
                onClick={() => setOpen(false)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  isCurrent(link.href)
                    ? "bg-brass/10 text-brass-strong"
                    : "text-cream-muted hover:bg-surface-raised hover:text-cream"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Desktop: fixed sidebar */}
      <nav
        className="hidden w-56 shrink-0 flex-col gap-1 md:flex"
        aria-label={t.aria}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={href(link.href)}
            aria-current={isCurrent(link.href) ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              isCurrent(link.href)
                ? "bg-brass/10 text-brass-strong"
                : "text-cream-muted hover:bg-surface hover:text-cream"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
