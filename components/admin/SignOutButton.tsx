/**
 * Sign-out button for the admin header. Calls Better Auth's client helper,
 * which clears the session cookie, then hard-navigates to /admin/login.
 */
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLocaleHref } from "@/lib/i18n/links";
import { Button } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function SignOutButton({ t }: { t: Dictionary["admin"] }) {
  const router = useRouter();
  const href = useLocaleHref();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace(href("/admin/login"));
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      {t.signOut}
    </Button>
  );
}
