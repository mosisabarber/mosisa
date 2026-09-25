import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionFromRequest, requireSession } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const unauthorized = requireSession(session);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "no_file", message: "A file must be provided." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: "invalid_type",
          message: "Only JPG, PNG, WEBP, or AVIF image files are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "file_too_large",
          message: "Image must be under 5MB.",
        },
        { status: 400 }
      );
    }

    // Sanitize filename prefix
    const cleanName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "-")
      .replace(/-+/g, "-");
    const filename = `barbers/${Date.now()}-${cleanName}`;

    const blob = await put(filename, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[admin upload] failed:", err);
    return NextResponse.json(
      { error: "upload_failed", message: "Failed to upload image." },
      { status: 500 }
    );
  }
}
