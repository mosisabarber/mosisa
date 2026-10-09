/**
 * Root admin layout (AGENTS.md §6 / Stage 8).
 *
 * Provides the shared chrome (header + sidebar nav) for /admin/*. Auth is NOT
 * enforced here — it lives in `AdminPageGate`, a small wrapper each protected
 * page composes, so /admin/login can render its own <html> document and escape
 * the gate cleanly.
 *
 * Responsive shell: below `md` the sidebar collapses into AdminNav's hamburger
 * dropdown and the shell stacks vertically (nav above main); from `md` up it is
 * the original fixed sidebar + content row.
 */
import Link from "next/link";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { localeHref } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getDictionary(lang);
  return {
    title: `Mosisa ${t.admin.brandSuffix}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);
  const t: Dictionary = await getDictionary(lang);
  const href = (path: string) => localeHref(locale, path);
  return (
    <>
      <a href="#content" className="skip-link">
        {t.admin.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-charcoal/90 backdrop-blur">
        <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          <Link
            href={href("/admin")}
            className="font-heading truncate text-lg font-semibold tracking-wide text-cream"
          >
            Mosisa<span className="text-brass">.</span> {t.admin.brandSuffix}
          </Link>
          <div className="flex shrink-0 items-center gap-4">
            <LanguageSwitcher t={t} />
            <ThemeToggle label={t.nav.theme} />
            <SignOutButton t={t.admin} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-y-4 px-3 py-6 sm:px-4 sm:py-8 md:flex-row md:gap-x-6 md:gap-y-0">
        <AdminNav t={t.admin.nav} />
        <main id="content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}


