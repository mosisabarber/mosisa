/**
 * Staff login — the ONLY public route under /admin (AGENTS.md §6: no public
 * signup, staff accounts are seeded via `npm run seed:staff`).
 *
 * This page renders its own <html> document because app/admin/layout.tsx
 * gates the rest of the admin section — login lives outside that gate. If the
 * visitor is already authenticated, redirect them straight to the dashboard.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-server";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Mosisa Admin — Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full items-center justify-center bg-charcoal font-sans text-cream">
        <LoginForm />
      </body>
    </html>
  );
}

