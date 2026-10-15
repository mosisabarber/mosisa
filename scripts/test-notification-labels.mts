/**
 * Checks the bilingual notification labels + the notification site-URL
 * fallback used by the booking/manage message-sending routes.
 * Run: npx tsx scripts/test-notification-labels.mts
 */
import {
  formatBilingualDate,
  formatBilingualTime,
} from "../lib/booking/time.js";
import { notificationSiteUrl } from "../lib/seo.js";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label} → ${String(actual)}${
      ok ? "" : ` (expected ${String(expected)})`
    }`
  );
}

// 2026-10-15 09:00 Addis (= 06:00Z) → '9:00 AM (3:00 ጠዋት)';
// Ethiopian calendar: 2026-10-04 = 24 መስከረም 2019, so +11 days = 5 ጥቅምት.
const NOON = Date.parse("2026-10-15T06:00:00Z"); // 09:00 in Addis (UTC+3)
check("time 09:00 Addis", formatBilingualTime(NOON), "9:00 AM (3:00 ጠዋት)");
check("date 2026-10-15", formatBilingualDate(NOON), "2026-10-15 (5 ጥቅምት 2019)");

// Evening slot: 19:00 Addis → '7:00 PM (1:00 ምሽት)'.
const EVENING = Date.parse("2026-10-15T16:00:00Z");
check("time 19:00 Addis", formatBilingualTime(EVENING), "7:00 PM (1:00 ምሽት)");

// Midnight edge: 00:30 Addis → '12:30 AM (6:30 ሌሊት)'.
const MIDNIGHT = Date.parse("2026-10-14T21:30:00Z");
check("time 00:30 Addis", formatBilingualTime(MIDNIGHT), "12:30 AM (6:30 ሌሊት)");

// Noon Addis: 12:00 → '12:00 PM (6:00 ከሰዓት)'.
const ADDIS_NOON = Date.parse("2026-10-15T09:00:00Z");
check("time 12:00 Addis", formatBilingualTime(ADDIS_NOON), "12:00 PM (6:00 ከሰዓት)");

// --- notificationSiteUrl -------------------------------------------------
// Configured value wins (trailing slash normalized).
process.env.NEXT_PUBLIC_SITE_URL = "https://mosisabarber.com/";
const withHost = new Request("https://mosisabarber.com/api/booking", {
  headers: { "x-forwarded-host": "other.example", "x-forwarded-proto": "https" },
});
check("env wins", notificationSiteUrl(withHost), "https://mosisabarber.com");

// Unset env → fall back to the origin the request arrived on.
delete process.env.NEXT_PUBLIC_SITE_URL;
check(
  "forwarded origin",
  notificationSiteUrl(
    new Request("http://localhost:3000/api/booking", {
      headers: {
        "x-forwarded-host": "mosisabarber.com",
        "x-forwarded-proto": "https",
      },
    })
  ),
  "https://mosisabarber.com"
);
check(
  "plain host (https origin page)",
  notificationSiteUrl(
    new Request("https://mosisabarber.com/api/booking", {
      headers: { host: "mosisabarber.com" },
    })
  ),
  "https://mosisabarber.com"
);
check(
  "localhost dev",
  notificationSiteUrl(
    new Request("http://localhost:3000/api/booking", { headers: { host: "localhost:3000" } })
  ),
  "http://localhost:3000"
);
check(
  "no headers at all",
  notificationSiteUrl(new Request("http://x/")),
  "http://localhost:3000"
);

console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
