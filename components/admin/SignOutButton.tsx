/**
 * Sign-out button for the admin header. Calls Better Auth's client helper,
 * which clears the session cookie, then hard-navigates to /admin/login.
 */
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/admin/login");
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
