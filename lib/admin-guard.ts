/**
 * Server-side auth guard for /api/admin/* route handlers (AGENTS.md §6 / §8).
 *
 * Route handlers don't have access to `headers()` from next/headers the same
 * way Server Components do — they receive a `Request`. We extract the session
 * via Better Auth and return null (or throw a 401) so every admin route can
 * stay a single readable guard call.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "@/lib/auth";

/**
 * Returns the active staff session for this request, or `null` when
 * unauthenticated. Use `requireSession` if the route should reject.
 */
export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Rejects the request with 401 when there is no staff session.
 * Intended as the first line of an admin route handler.
 */
export function requireSession(session: Session | null) {
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
