/**
 * Email wrapper over Resend (AGENTS.md §7) — the ONLY place the app talks to
 * Resend. Provider-swappable; must fail gracefully: a notification failure
 * must NEVER roll back or fail the booking itself.
 */
export interface NotificationResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { success: false, error: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // TODO(Stage 6): switch to the shop's verified domain sender.
        from: "Mosisa Barber Shop <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend ${response.status}: ${body}`);
      return { success: false, error: `resend_${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[email] send failed:", error);
    return { success: false, error: "network" };
  }
}
