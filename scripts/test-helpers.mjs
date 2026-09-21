/**
 * Shared helpers for the Stage 9 test suite (AGENTS.md §16).
 *
 * The three pre-existing smoke scripts each re-implemented their own
 * assert/counter plumbing; this module is the single copy they all share going
 * forward. Plain Node only — no test framework, matching the existing scripts.
 */
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

let pool = null;

/**
 * Direct DB access — used for *setup and teardown*, never to assert behaviour.
 * Behaviour is always asserted through the HTTP API so the tests exercise the
 * real request path. Mirrors the approach in smoke-booking.mjs.
 */
export function db() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("DATABASE_URL is not set (expected in .env.local).");
      process.exit(2);
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Find an active barber + service pair (by slug/name, like the smoke tests). */
export async function discoverPair() {
  const barber = (
    await db().query(
      `SELECT id, name, slug, buffer_minutes FROM barbers WHERE is_active = true ORDER BY name LIMIT 1`
    )
  ).rows[0];
  const service = (
    await db().query(
      `SELECT id, name, duration_minutes FROM services WHERE is_active = true ORDER BY name LIMIT 1`
    )
  ).rows[0];
  if (!barber || !service) return null;
  return {
    barberId: barber.id,
    serviceId: service.id,
    barberName: barber.name,
    serviceName: service.name,
    bufferMinutes: barber.buffer_minutes,
    durationMinutes: service.duration_minutes,
  };
}


let passed = 0;
let failed = 0;
const failures = [];

/** Basic assertion. Records a failure instead of throwing so one bad check
    does not abort the whole suite. */
export function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${label}`);
  } else {
    failed++;
    failures.push(label + (detail ? ` — ${detail}` : ""));
    console.log(`  \u2717 ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Compare two values with a readable diff on failure. */
export function checkEqual(label, actual, expected) {
  check(
    label,
    actual === expected,
    actual === expected ? "" : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

export function section(title) {
  console.log(`\n=== ${title} ===`);
}

/** Suite summary + exit code. Call at the end of every test file. */
export function summary(suiteName) {
  console.log(`\n${suiteName}: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("Failures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`ALL ${suiteName.toUpperCase()} CHECKS PASSED`);
}

/**
 * Fail fast with a clear message when the dev server is not reachable.
 * Every suite calls this first so a forgotten `npm run dev` produces a
 * one-line explanation rather than a stack trace.
 */
export async function requireServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/booking/availability?barber_id=00000000-0000-0000-0000-000000000000&service_id=00000000-0000-0000-0000-000000000000&start_date=2026-01-01&end_date=2026-01-02`, {
      signal: AbortSignal.timeout(10000),
    });
    // Any HTTP response means the server is up (404 is expected for a bogus id).
    if (res.status >= 500) throw new Error(`server returned ${res.status}`);
  } catch (err) {
    console.error(`\nCannot reach the dev server at ${BASE_URL}.`);
    console.error("Start it first:  npm run dev\n");
    console.error(String(err?.message ?? err));
    process.exit(2);
  }
}

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    signal: options.signal ?? AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/** Addis 'YYYY-MM-DD' for an instant offset by `days` from now. */
export function addisDateKeyOffset(days) {
  const ms = Date.now() + days * 24 * 3600 * 1000 + 3 * 3600 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** A unique-enough tag so parallel/rerun suites never collide. */
export function uniqueTag(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Pick a usable far-future slot from an availability response.
 * `minDaysOut` keeps the slot clear of the 1-minute lead time and of slots the
 * current hour has already consumed.
 */
export function pickSlot(availability, minDaysOut = 3) {
  if (!availability?.days) return null;
  const floor = addisDateKeyOffset(minDaysOut);
  for (const day of availability.days) {
    if (day.date < floor) continue;
    if (day.slots?.length) return { date: day.date, iso: day.slots[0] };
  }
  return null;
}

export { passed, failed };
