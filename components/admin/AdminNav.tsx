/**
 * Sidebar navigation for the admin dashboard (AGENTS.md §6 / Stage 8).
 * Mirrors the public NavMenu's brass/cream styling.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/barbers", label: "Barbers" },
  { href: "/admin/hours", label: "Working hours" },
  { href: "/admin/blocked-times", label: "Blocked times" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 md:flex" aria-label="Admin">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            pathname === link.href
              ? "bg-brass/10 text-brass-strong"
              : "text-cream-muted hover:bg-surface hover:text-cream"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
