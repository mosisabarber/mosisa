/**
 * SMS wrapper (AGENTS.md §7) — the ONLY place the app may talk to an SMS
 * provider. All sends (confirmation, future reminders) go through
 * `sendSMS(to, message)`; never call the provider API from routes or
 * booking logic. Provider-swappable; fails gracefully — an SMS failure must
 * NEVER roll back or fail the booking itself.
 *
 * NOTE(Stage 6): the SMSEthiopia request shape is deliberately NOT guessed
 * here — per the product spec (§19) the provider integration details are to
 * be finalized in Stage 6. Until then sends are skipped with a warning when
 * (or before) the key is configured, and the confirmation modal remains the
 * customer's fallback.
 */
import type { NotificationResult } from "./email";

export async function sendSMS(
  to: string,
  message: string
): Promise<NotificationResult> {
  const apiKey = process.env.SMSETHIOPIA_API_KEY;
  if (!apiKey) {
    console.warn("[sms] SMSETHIOPIA_API_KEY not set — skipping send");
    return { success: false, error: "not_configured" };
  }

  // TODO(Stage 6): implement the SMSEthiopia HTTP call per their docs
  // (exact endpoint/auth/env var name to be confirmed before this ships).
  console.info(`[sms] Stage 6 pending — would send to ${to}: ${message}`);
  return { success: false, error: "provider_integration_pending" };
}
