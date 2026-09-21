/**
 * Admin working-hours management (AGENTS.md §3 / Stage 8).
 *
 * - GET    /api/admin/working-hours        → list (one row per day_of_week)
 * - POST   /api/admin/working-hours        → upsert all 7 rows from a body of
 *    { "open_0": "09:00", "close_0": "18:00", ... } (day_of_week keyed).
 *
 * POST replaces the whole table in a single transaction so the editor can
 * write all days at once without a multipart key.
 */
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { workingHours } from "@/db/schema";
import { getSessionFromRequest, requireSession } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  const all = await db
    .select()
    .from(workingHours)
    .orderBy(workingHours.dayOfWeek);
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  // Build the 7 rows. An empty "open" value for a day means the shop is closed
  // that day (no row inserted).
  const rows: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const open = body[`open_${i}`] as string | undefined;
    const close = body[`close_${i}`] as string | undefined;
    if (open && close) {
      rows.push({
        dayOfWeek: i,
        startTime: open.length >= 5 ? `${open.slice(0, 5)}:00` : open,
        endTime: close.length >= 5 ? `${close.slice(0, 5)}:00` : close,
      });
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(workingHours);
      if (rows.length > 0) {
        await tx.insert(workingHours).values(rows);
      }
    });
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("[admin working-hours] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
