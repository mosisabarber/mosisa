/**
 * End-to-end check of the customer messages (AGENTS.md §7) WITHOUT sending
 * anything: the real route handlers run against the dev database, but the
 * outbound Resend/SMSEthiopia calls are intercepted, recorded and "sent".
 *
 * Verifies for confirmation, reschedule and cancel:
 *   1. The manage link points at https://mosisabarber.com/manage/<token>
 *      (NEXT_PUBLIC_SITE_URL is forced here; the fallback is covered by
 *      scripts/test-notification-labels.mts).
 *   2. Times are plain ASCII 12-hour: '3:00 PM'; dates plain 'YYYY-MM-DD'.
 *   3. NO Amharic/Unicode anywhere — SMS must stay GSM-7 (single segment).
 *   4. Every SMS is ≤150 chars (one GSM-7 segment, headroom under 160).
 *   5. Messages open 'Dear <first word of name>' and name the service +
 *      barber ("you are booking X with Y").
 *   6. Nothing is sent to a real provider (fetch is stubbed).
 *
 * Creates one appointment and cancels it at the end (same footprint as
 * `npm run test:booking`). Requires .env.local with a reachable DATABASE_URL.
 * Run: npx tsx scripts/test-notification-messages.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Force the production domain so the captured links are the ones customers
// will really receive.
process.env.NEXT_PUBLIC_SITE_URL = "https://mosisabarber.com";

/** Intercept provider traffic instead of sending it. */
interface Captured {
  kind: "sms" | "email";
  to: string;
  subject?: string;
  body: string;
}
const captured: Captured[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("smsethiopia.com")) {
    const payload = JSON.parse(String(init?.body)) as { msisdn: string; text: string };
    captured.push({ kind: "sms", to: payload.msisdn, body: payload.text });
    return new Response(JSON.stringify({ sent: true, id: 0 }), { status: 200 });
  }
  if (url.includes("api.resend.com")) {
    const payload = JSON.parse(String(init?.body)) as {
      to: string[];
      subject: string;
      html: string;
    };
    captured.push({
      kind: "email",
      to: payload.to.join(","),
      subject: payload.subject,
      body: payload.html,
    });
    return new Response(JSON.stringify({ id: "test" }), { status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL!);
const { addisDateKey } = await import("../lib/booking/time");
const bookingRoute = await import("../app/api/booking/route");
const manageRoute = await import("../app/api/manage/[token]/route");

let failures = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

function freshPhone() {
  const n = Math.floor(Math.random() * 1e8);
  return (n % 2 === 0 ? "09" : "07") + String(n).padStart(8, "0").slice(-8);
}

function addisIso(offsetDays: number, hh: number, mm: number): string {
  const key = addisDateKey(Date.now() + offsetDays * 86_400_000);
  return `${key}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+03:00`;
}

async function postBooking(payload: unknown) {
  const req = new Request("http://localhost:3000/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(payload),
  });
  const res = await bookingRoute.POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, string> };
}

const [{ barber }] = (await sql`
  select id::text as barber from barbers where is_active = true limit 1`) as [
  { barber: string },
];
const [{ service }] = (await sql`
  select id::text as service
  from services where is_active = true limit 1`) as [{ service: string }];
if (!barber || !service) {
  console.error("No active barber/service — run `npm run seed:demo` first.");
  process.exit(1);
}

// --- 1. Book ---------------------------------------------------------------
const phone = freshPhone();
let booked: Awaited<ReturnType<typeof postBooking>> | null = null;
for (const [day, hour, minute] of [
  [3, 10, 20],
  [4, 10, 20],
  [5, 15, 40],
  [6, 12, 20],
  [7, 16, 20],
] as const) {
  booked = await postBooking({
    barber_id: barber,
    service_id: service,
    // Full name on purpose: every message must greet with the FIRST word.
    customer_name: "Dawit Tesfaye",
    customer_phone: phone,
    customer_email: "notification-test@example.com",
    start_datetime: addisIso(day, hour, minute),
  });
  if (booked.status === 201) break;
}
if (booked?.status !== 201) {
  console.error("Could not book a test slot:", booked?.status, booked?.body);
  process.exit(1);
}
const token = booked.body.management_token!;
console.log(`booked test appointment (token ${token.slice(0, 8)}…)\n`);

const bookingSms = captured.find((c) => c.kind === "sms");
const bookingEmail = captured.find((c) => c.kind === "email");
check("confirmation SMS captured", Boolean(bookingSms));
check("confirmation email captured", Boolean(bookingEmail));
for (const msg of [bookingSms, bookingEmail]) {
  if (!msg) continue;
  const tag = msg.kind;
  check(`${tag} greets with first word of name`, msg.body.includes("Dear Dawit,"));
  check(`${tag} names service + barber`, /you are booking .+ with /.test(msg.body) || msg.body.includes("You are booking"), msg.body.slice(0, 80));
  check(`${tag} manage link uses the domain`, msg.body.includes(`https://mosisabarber.com/manage/${token}`));
  check(`${tag} plain 12-hour time`, /\d{1,2}:\d{2} (AM|PM)/.test(msg.body), msg.body.match(/\d{1,2}:\d{2} (AM|PM)/)?.[0] ?? "");
  check(`${tag} plain YYYY-MM-DD date`, /\d{4}-\d{2}-\d{2}/.test(msg.body), msg.body.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "");
  check(`${tag} no Amharic/Unicode (GSM-7)`, !/[^\x00-\x7F]/.test(msg.body), msg.body.match(/[^\x00-\x7F]/)?.[0] ?? "");
}
check("confirmation SMS ≤150 chars", (bookingSms?.body.length ?? 0) <= 150, `len=${bookingSms?.body.length}`);

// --- 2. Reschedule ---------------------------------------------------------
const markReschedule = captured.length;
const patchRes = await manageRoute.PATCH(
  new Request(`http://localhost:3000/api/manage/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ management_token: token, start_datetime: addisIso(4, 15, 40) }),
  }),
  { params: Promise.resolve({ token }) }
);
const patchBody = (await patchRes.json()) as { ok?: boolean };
check("reschedule accepted", patchRes.status === 200 && patchBody.ok === true);
const reschedSms = captured.slice(markReschedule).find((c) => c.kind === "sms");
const reschedEmail = captured.slice(markReschedule).find((c) => c.kind === "email");
check("reschedule SMS captured", Boolean(reschedSms));
check("reschedule email captured", Boolean(reschedEmail));
for (const msg of [reschedSms, reschedEmail]) {
  if (!msg) continue;
  check(`${msg.kind} reschedule greets with first word of name`, msg.body.includes("Dear Dawit,"));
  check(`${msg.kind} reschedule names service + barber`, /(your|Your) .+ with .+ (is moved|has been moved)/.test(msg.body), msg.body.slice(0, 90));
  check(`${msg.kind} reschedule link uses the domain`, msg.body.includes(`https://mosisabarber.com/manage/${token}`));
  check(`${msg.kind} reschedule plain 12-hour time`, /\d{1,2}:\d{2} (AM|PM)/.test(msg.body));
  check(`${msg.kind} reschedule no Amharic/Unicode (GSM-7)`, !/[^\x00-\x7F]/.test(msg.body), msg.body.match(/[^\x00-\x7F]/)?.[0] ?? "");
}
check("reschedule SMS ≤150 chars", (reschedSms?.body.length ?? 0) <= 150, `len=${reschedSms?.body.length}`);

// --- 3. Cancel -------------------------------------------------------------
const markCancel = captured.length;
const delRes = await manageRoute.DELETE(
  new Request(`http://localhost:3000/api/manage/${token}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ management_token: token }),
  }),
  { params: Promise.resolve({ token }) }
);
const delBody = (await delRes.json()) as { ok?: boolean };
check("cancel accepted", delRes.status === 200 && delBody.ok === true);
const cancelSms = captured.slice(markCancel).find((c) => c.kind === "sms");
const cancelEmail = captured.slice(markCancel).find((c) => c.kind === "email");
check("cancel SMS captured", Boolean(cancelSms));
check("cancel email captured", Boolean(cancelEmail));
for (const msg of [cancelSms, cancelEmail]) {
  if (!msg) continue;
  check(`${msg.kind} cancel greets with first word of name`, msg.body.includes("Dear Dawit,"));
  check(`${msg.kind} cancel names the service`, /(your|Your) .+ appointment/.test(msg.body), msg.body.slice(0, 90));
  check(`${msg.kind} cancel plain 12-hour time`, /\d{1,2}:\d{2} (AM|PM)/.test(msg.body));
  check(`${msg.kind} cancel no Amharic/Unicode (GSM-7)`, !/[^\x00-\x7F]/.test(msg.body), msg.body.match(/[^\x00-\x7F]/)?.[0] ?? "");
  check(`${msg.kind} book-again link uses the domain`, msg.body.includes("https://mosisabarber.com/book"));
}
check("cancel SMS ≤150 chars", (cancelSms?.body.length ?? 0) <= 150, `len=${cancelSms?.body.length}`);

// --- What the customer would receive --------------------------------------
console.log("\n=== captured messages (nothing was actually sent) ===");
for (const c of captured) {
  console.log(`\n[${c.kind}] to: ${c.to}${c.subject ? `  subject: ${c.subject}` : ""}\n${c.body}`);
}

console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
