/**
 * Rate limiting for booking creation (AGENTS.md §8) — applied BEFORE the
 * insert, never a silent failure (the frontend must be able to display it).
 *
 * - Phone: DB-backed — at most one booking per customer_phone within a
 *   rolling window (counts rows in `appointments`, so it survives restarts).
 * - IP: in-memory sliding window over ALL POST /api/booking attempts
 *   (successful or not). Resets on redeploy/cold-start — an accepted v1
 *   trade-off; thresholds are configurable below.
 */
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments } from "@/db/schema";

// Configurable thresholds (implementation detail per §8)
const PHONE_RETRY_WINDOW_MS = 60 * 1000; // 2nd booking from same phone within 60s → reject

/**
 * IP ceiling. Deliberately generous: in Ethiopia most customers reach the site
 * through carrier NAT / shared WiFi, so a tight per-IP cap would block real
 * people (the per-phone rule above is the meaningful anti-spam guard).
 */
const IP_MAX_ATTEMPTS = 30; // max booking POSTs per IP…
const IP_WINDOW_MS = 60 * 60 * 1000; // …per rolling hour

/**
 * IPs exempt from the IP ceiling (loopback + private ranges). This keeps local
 * development and the smoke/concurrency test scripts from tripping the guard;
 * the per-phone rule still applies to them, so tests stay meaningful.
 */
const IP_ALLOWLIST = new Set(["unknown", "127.0.0.1", "::1", "localhost"]);

function isAllowlistedIp(ip: string): boolean {
  if (IP_ALLOWLIST.has(ip)) return true;
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("::ffff:127.")
  );
}

/** ip → timestamps of recent attempts */
const ipHits = new Map<string, number[]>();

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "phone" | "ip";
      retryAfterSeconds: number;
    };

export async function checkBookingRateLimit(
  phone: string,
  ip: string
): Promise<RateLimitResult> {
  const now = Date.now();

  // --- phone (DB-backed) ----------------------------------------------------
  const phoneCutoff = new Date(now - PHONE_RETRY_WINDOW_MS);
  const recentForPhone = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerPhone, phone),
        gt(appointments.createdAt, phoneCutoff)
      )
    )
    .limit(1);

  if (recentForPhone.length > 0) {
    return {
      allowed: false,
      reason: "phone",
      retryAfterSeconds: Math.ceil(PHONE_RETRY_WINDOW_MS / 1000),
    };
  }

  // --- ip (in-memory sliding window) ----------------------------------------
  // Loopback/private IPs (local dev, automated tests) skip the IP ceiling.
  if (isAllowlistedIp(ip)) {
    return { allowed: true };
  }

  const ipCutoff = now - IP_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter((t) => t > ipCutoff);

  if (hits.length >= IP_MAX_ATTEMPTS) {
    const oldest = Math.min(...hits);
    return {
      allowed: false,
      reason: "ip",
      retryAfterSeconds: Math.ceil((oldest + IP_WINDOW_MS - now) / 1000),
    };
  }

  hits.push(now);
  ipHits.set(ip, hits);

  // Opportunistic cleanup so the map cannot grow unbounded
  if (ipHits.size > 10_000) {
    for (const [key, times] of ipHits) {
      if (times.every((t) => t <= ipCutoff)) ipHits.delete(key);
    }
  }

  return { allowed: true };
}

/** Extract a client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
