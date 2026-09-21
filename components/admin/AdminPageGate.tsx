/**
 * Server-side gate for protected admin pages (AGENTS.md §6 / Stage 8).
 *
 * Usage at the top of a Server Component:
 *   const session = await requireAdmin();
 *   ...use session.user...
 *
 * Redirects to /admin/login (303) when there's no session so the login page
 * can render its own document. This is the auth boundary — pages don't call
 * getRequiredSession themselves.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin-server";

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}
