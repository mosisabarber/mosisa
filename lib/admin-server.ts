/**
 * Server-side session helpers for the admin dashboard (AGENTS.md §6).
 *
 * Better Auth stores the session in a cookie; these helpers read it on the
 * server so protected /admin Server Components can gate access before they
 * touch the DB. `getRequiredSession` redirects to /admin/login when there's
 * no session — used at the top of a layout so unauthenticated visitors are
 * sent to the login page.
 *
 * Canonical call shape per the Better Auth Next.js guide:
 *   auth.api.getSession({ headers: await headers() })
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getRequiredSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    // 303 → GET, so the browser ends up at the login page after a POST.
    redirect("/admin/login");
  }

  return session;
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

