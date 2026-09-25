/**
 * Barber create/edit form (client component). Posts JSON to
 * /api/admin/barbers (POST create / PATCH edit). Reuses existing primitives.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Image from "next/image";
import type { Barber } from "@/lib/admin-data";
import { Button, Input, Modal, Spinner } from "@/components/ui";

export function BarberForm({ mode, barber }: { mode: "create" | "edit"; barber?: Barber }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(barber?.name ?? "");
  const [slug, setSlug] = useState(barber?.slug ?? "");
  const [bio, setBio] = useState(barber?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(barber?.photoUrl ?? "");
  const [buffer, setBuffer] = useState(barber?.bufferMinutes?.toString() ?? "0");
  const [specialties, setSpecialties] = useState(barber?.specialties?.join(", ") ?? "");
  const [isActive, setIsActive] = useState(barber?.isActive ?? true);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? `Upload failed (${res.status})`);
      } else {
        const data = await res.json();
        if (data.url) {
          setPhotoUrl(data.url);
        }
      }
    } catch {
      setError("Network error while uploading photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        slug,
        bio: bio || null,
        photoUrl: photoUrl || null,
        bufferMinutes: Number(buffer),
        specialties: specialties
          ? specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        isActive,
      };
      const res = await fetch(
        "/api/admin/barbers" + (mode === "edit" && barber?.id ? `?id=${barber.id}` : ""),
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Save failed (${res.status})`);
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const trigger = mode === "create" ? (
    <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
      + New barber
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
      Edit
    </Button>
  );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "create" ? "New barber" : "Edit barber"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-error">{error}</p>}
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />

          {/* Photo Upload & Preview */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-cream-muted">Photo</span>

            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={name || "Barber photo"}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xs text-cream-muted">No photo</span>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-charcoal/80">
                    <Spinner className="h-5 w-5 text-brass" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
                  </Button>

                  {photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      onClick={() => setPhotoUrl("")}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-cream-muted">
                  JPG, PNG, WebP or AVIF (Max 5MB)
                </p>
              </div>
            </div>

            {/* Direct URL input fallback */}
            <details className="mt-1 text-xs text-cream-muted">
              <summary className="cursor-pointer hover:text-cream">Or enter image URL manually</summary>
              <div className="mt-2">
                <Input
                  hideLabel
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>
            </details>
          </div>

          <Input
            label="Buffer (minutes)"
            type="number"
            min={0}
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
          />
          <Input
            label="Specialties (comma-separated)"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
