/**
 * Admin barbers CRUD (AGENTS.md §6 / Stage 8).
 * - GET    /api/admin/barbers        → list
 * - POST   /api/admin/barbers        → create
 * - PATCH  /api/admin/barbers?id=…   → update
 * - DELETE /api/admin/barbers?id=…   → soft-disable (is_active=false)
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { getSessionFromRequest, requireSession } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  const all = await db.select().from(barbers).orderBy(barbers.name);
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
  const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!name || !slug) {
    return NextResponse.json(
      { error: "invalid_input", message: "name and a valid slug are required" },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .insert(barbers)
      .values({
        name,
        slug,
        bio: typeof body.bio === "string" ? body.bio || null : null,
        photoUrl: typeof body.photoUrl === "string" ? body.photoUrl || null : null,
        bufferMinutes: typeof body.bufferMinutes === "number" ? body.bufferMinutes : 0,
        specialties: Array.isArray(body.specialties) ? (body.specialties as string[]) : [],
        isActive: body.isActive !== false,
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
        { error: "conflict", message: "A barber with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin barbers] POST failed:", err);
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
  if (typeof body.slug === "string") {
    patch.slug = body.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  if (typeof body.bio === "string") patch.bio = body.bio;
  if (typeof body.photoUrl === "string") patch.photoUrl = body.photoUrl;
  if (typeof body.bufferMinutes === "number") patch.bufferMinutes = body.bufferMinutes;
  if (Array.isArray(body.specialties)) patch.specialties = body.specialties as string[];
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(barbers)
      .set(patch)
      .where(eq(barbers.id, id))
      .returning();
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("[admin barbers] PATCH failed:", err);
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
    .update(barbers)
    .set({ isActive: false })
    .where(eq(barbers.id, id))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
