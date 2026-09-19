import { createAuthClient } from "better-auth/react";

/** Client-side auth helper for admin UI (Stage 8). Same-domain by default. */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
