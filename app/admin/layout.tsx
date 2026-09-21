/**
 * Root admin layout (AGENTS.md §6 / Stage 8).
 *
 * Provides the shared chrome (header + sidebar nav) for /admin/*. Auth is NOT
 * enforced here — it lives in `AdminPageGate`, a small wrapper each protected
 * page composes, so /admin/login can render its own <html> document and escape
 * the gate cleanly.
 */
import Link from "next/link";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Mosisa Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-charcoal/90 backdrop-blur">
        <div className="mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/admin"
            className="font-heading text-lg font-semibold tracking-wide text-cream"
          >
            Mosisa<span className="text-brass">.</span> Admin
          </Link>
          <div className="flex items-center gap-4">
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-x-6 px-4 py-8">
        <AdminNav />
        <main id="content" tabIndex={-1} className="flex-1">{children}</main>
      </div>
    </>
  );
}


