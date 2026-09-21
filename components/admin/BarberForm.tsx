/**
 * Barber create/edit form (client component). Posts JSON to
 * /api/admin/barbers (POST create / PATCH edit). Reuses existing primitives.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Barber } from "@/lib/admin-data";
import { Button, Input, Modal } from "@/components/ui";

export function BarberForm({ mode, barber }: { mode: "create" | "edit"; barber?: Barber }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(barber?.name ?? "");
  const [slug, setSlug] = useState(barber?.slug ?? "");
  const [bio, setBio] = useState(barber?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(barber?.photoUrl ?? "");
  const [buffer, setBuffer] = useState(barber?.bufferMinutes?.toString() ?? "0");
  const [specialties, setSpecialties] = useState(barber?.specialties?.join(", ") ?? "");
  const [isActive, setIsActive] = useState(barber?.isActive ?? true);

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
          <Input label="Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
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
