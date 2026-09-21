/**
 * Staff login form (client component — needs live error/loading state and a
 * redirect on success). Posts to Better Auth's `/api/auth/sign-in/email`
 * endpoint via the client helper.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Input, Card } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
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
      setError(err.message ?? "Sign in failed. Please try again.");
      setLoading(false);
      return;
    }

    if (data) {
      router.replace("/admin");
    }
  }

  return (
    <Card
      tone="raised"
      className="w-full max-w-md border-line p-8"
      aria-label="Login form"
    >
      <h1 className="font-heading mb-6 text-2xl font-semibold text-cream">
        Staff login
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-error/15 border border-error/30 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
