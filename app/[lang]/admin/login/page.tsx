/**
 * Staff login — the ONLY public route under /admin (AGENTS.md §6: no public
 * signup, staff accounts are seeded via `npm run seed:staff`).
 *
 * Renders its own <html> (with the locale's `lang`) so the sign-in screen gets
 * the right typography, and redirects authenticated staff straight to the
 * dashboard — both `/en/admin` and `/am/admin`.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-server";
import { LoginForm } from "@/components/admin/LoginForm";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { LOCALE_TAGS } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getDictionary(lang);
  return {
    title: t.admin.login.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLocale(lang);
  const t = await getDictionary(lang);
  const session = await getSession();
  if (session?.user) {
    redirect(`/${lang}/admin`);
  }

  return (
    <html lang={LOCALE_TAGS[locale]} className="h-full">
      <body className="flex min-h-full items-center justify-center bg-charcoal font-sans text-cream">
        <LoginForm t={t.admin.login} />
      </body>
    </html>
  );
}

