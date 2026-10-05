/**
 * Staff login form (client component — needs live error/loading state and a
 * redirect on success). Posts to Better Auth's `/api/auth/sign-in/email`
 * endpoint via the client helper.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useLocaleHref } from "@/lib/i18n/links";
import { Button, Input, Card } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type LoginT = Dictionary["admin"]["login"];

export function LoginForm({ t }: { t: LoginT }) {
  const router = useRouter();
  const href = useLocaleHref();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
    });

    if (err) {
      setError(err.message ?? t.failed);
      setLoading(false);
      return;
    }

    if (data) {
      router.replace(href("/admin"));
    }
  }

  return (
    <Card
      tone="raised"
      className="w-full max-w-md border-line p-8"
      aria-label={t.formAria}
    >
      <h1 className="font-heading mb-6 text-2xl font-semibold text-cream">
        {t.heading}
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-error/15 border border-error/30 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <Input
          id="email"
          label={t.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label={t.password}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {loading ? t.signingIn : t.signIn}
        </Button>
      </form>
    </Card>
  );
}
