/**
 * Admin services CRUD (AGENTS.md §6 / Stage 8).
 *
 * - GET   /api/admin/services        → list all (incl. inactive)
 * - POST  /api/admin/services        → create
 * - PATCH /api/admin/services?id=…   → update (partial — only sent fields)
 * - DELETE /api/admin/services?id=…  → soft-disable (set is_active=false)
 *
 * All routes require a staff session (401 otherwise). Mutations re-validate
 * with the same Zod-ish shape used by the booking layer where applicable; here
 * we keep inline checks minimal and rely on the form validation on the client.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { getSessionFromRequest, requireSession } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  const all = await db.select().from(services).orderBy(services.name);
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const durationMinutes = Number(body.durationMinutes);
  const price = body.price;
  const isActive = body.isActive !== false;

  if (!name || Number.isNaN(durationMinutes) || durationMinutes < 1) {
    return NextResponse.json(
      { error: "invalid_input", message: "name and duration are required" },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .insert(services)
      .values({
        name,
        description: typeof body.description === "string" ? body.description || null : null,
        durationMinutes,
        price: typeof price === "string" ? price : String(price ?? 0),
        isActive,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    // Postgres unique_violation is 23505; Drizzle may wrap it in `cause`.
    const code =
      (err as { code?: string })?.code ??
      (err as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "conflict", message: "A service with that name already exists." },
        { status: 409 }
      );
    }
    console.error("[admin services] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

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
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.durationMinutes === "number") patch.durationMinutes = body.durationMinutes;
  if (typeof body.price === "string" || typeof body.price === "number")
    patch.price = body.price;
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.description === "string")
    patch.description = body.description;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(services)
      .set(patch)
      .where(eq(services.id, id))
      .returning();
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("[admin services] PATCH failed:", err);
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

  // Soft-disable so historical appointments still resolve the service.
  const [row] = await db
    .update(services)
    .set({ isActive: false })
    .where(eq(services.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
