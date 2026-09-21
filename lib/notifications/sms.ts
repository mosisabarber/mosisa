/**
 * SMS wrapper over SMSEthiopia (AGENTS.md §7) — the ONLY place the app may
 * talk to an SMS provider. All sends (confirmation, future reminders) go
 * through `sendSMS(to, message)`; never call the provider API from routes or
 * booking logic. Provider-swappable; fails gracefully — an SMS failure must
 * NEVER roll back or fail the booking itself.
 *
 * Provider contract (verified against smsethiopia.com/developer-docs.txt):
 *   POST https://smsethiopia.com/api/sms/send
 *   Headers: KEY: <api key>   (NOT Bearer)
 *   Body:    { "msisdn": "251911234567", "text": "..." }
 *   200 →    { "sent": true, "id": 0, "description": "Accepted for delivery" }
 */
import type { NotificationResult } from "./email";

const SMS_ENDPOINT = "https://smsethiopia.com/api/sms/send";

/**
 * Normalise any accepted Ethiopian input form to the provider's MSISDN
 * format. The booking schema (`lib/booking/validation.ts`) accepts
 * 09xxxxxxxx / 07xxxxxxxx optionally prefixed +251 / 251 / 0, and stores the
 * digits as typed — SMSEthiopia only accepts 251XXXXXXXXX (12 digits).
 *
 *   "0911234567"   → "251911234567"
 *   "+251911234567" → "251911234567"
 *   "251911234567"  → "251911234567"  (already correct)
 */
export function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("251")) return digits;
  if (digits.startsWith("0")) return `251${digits.slice(1)}`;
  // Bare 9XXXXXXXXX / 7XXXXXXXXX (local form without the leading 0)
  return `251${digits}`;
}

export async function sendSMS(
  to: string,
  message: string
): Promise<NotificationResult> {
  const apiKey = process.env.SMSETHIOPIA_API_KEY;
  if (!apiKey) {
    console.warn("[sms] SMSETHIOPIA_API_KEY not set — skipping send");
    return { success: false, error: "not_configured" };
  }

  const msisdn = toMsisdn(to);
  if (!/^251[97]\d{8}$/.test(msisdn)) {
    console.error(`[sms] refusing to send — unnormalisable number: ${to}`);
    return { success: false, error: "invalid_phone" };
  }

  try {
    const response = await fetch(SMS_ENDPOINT, {
      method: "POST",
      headers: {
        KEY: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msisdn, text: message }),
    });

    const body = (await response.json().catch(() => null)) as {
      sent?: boolean;
      description?: string;
    } | null;

    if (!response.ok || !body?.sent) {
      console.error(
        `[sms] SMSEthiopia ${response.status}: ${JSON.stringify(body) ?? "no body"}`
      );
      return { success: false, error: `smsethiopia_${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[sms] send failed:", error);
    return { success: false, error: "network" };
  }
}
