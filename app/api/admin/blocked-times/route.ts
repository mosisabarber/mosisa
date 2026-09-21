/**
 * Admin blocked-times CRUD (AGENTS.md §3 / §6 / Stage 8).
 * - GET    /api/admin/blocked-times        → list
 * - POST   /api/admin/blocked-times        → create
 * - DELETE /api/admin/blocked-times?id=…   → remove
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { blockedTimes } from "@/db/schema";
import { getSessionFromRequest, requireSession } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  const all = await db
    .select()
    .from(blockedTimes)
    .orderBy(blockedTimes.startDatetime);
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

  const start = new Date(body.start_datetime as string);
  const end = new Date(body.end_datetime as string);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json(
      { error: "invalid_input", message: "end must be after start" },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .insert(blockedTimes)
      .values({
        barberId: typeof body.barber_id === "string" ? body.barber_id : null,
        startDatetime: start,
        endDatetime: end,
        reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("[admin blocked-times] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  const [row] = await db
    .delete(blockedTimes)
    .where(eq(blockedTimes.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
