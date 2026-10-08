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
  // Amharic content is optional — store NULL/[] when blank so the public site
  // falls back to the English value.
  const nameAm = typeof body.nameAm === "string" ? body.nameAm.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const descriptionAm =
    typeof body.descriptionAm === "string" ? body.descriptionAm.trim() : "";
  const durationMinutes = Number(body.durationMinutes);
  // Price is optional: blank / null / undefined → NULL (no price shown).
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
        nameAm: nameAm || null,
        description: description || null,
        descriptionAm: descriptionAm || null,
        durationMinutes,
        price: normalizePrice(price),
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

/**
 * Coerce an incoming price to the stored shape: a numeric string as-is, or
 * null when it is absent / blank / explicitly null (column is nullable).
 */
function normalizePrice(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  return null;
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
  if (typeof body.nameAm === "string" || body.nameAm === null)
    patch.nameAm = typeof body.nameAm === "string" ? body.nameAm.trim() || null : null;
  if (typeof body.durationMinutes === "number") patch.durationMinutes = body.durationMinutes;
  // Explicit null clears the price; a string/number sets it ("" → null).
  if (
    typeof body.price === "string" ||
    typeof body.price === "number" ||
    body.price === null
  )
    patch.price = normalizePrice(body.price);
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.description === "string")
    patch.description = body.description.trim() || null;
  if (typeof body.descriptionAm === "string" || body.descriptionAm === null)
    patch.descriptionAm =
      typeof body.descriptionAm === "string" ? body.descriptionAm.trim() || null : null;

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
