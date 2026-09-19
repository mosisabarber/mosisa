"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/barbers", label: "Barbers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Site header per spec §8: hamburger menu for secondary links, while
 * "Book Now" is a separate persistent button — always visible, never nested
 * inside the hamburger.
 */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-charcoal/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
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
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === link.href
                    ? "text-brass-strong"
                    : "text-cream-muted hover:text-cream"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Persistent Book Now — visible on every page, all breakpoints */}
          <Link href="/book">
            <Button size="sm">Book Now</Button>
          </Link>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="rounded-md p-2 text-cream-muted hover:bg-surface hover:text-cream md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
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
              href={link.href}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm",
                pathname === link.href
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
