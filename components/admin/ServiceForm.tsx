/**
 * Service create/edit form (client component). Posts JSON to the shared
 * /api/admin/services route (POST = create, PATCH = edit). Reuses the
 * existing Input + Button primitives.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Service } from "@/lib/admin-data";
import { Button, Input, Modal } from "@/components/ui";

async function submit(action: "create" | "edit", payload: Record<string, unknown>, id?: string) {
  const res = await fetch("/api/admin/services" + (id && action === "edit" ? `?id=${id}` : ""), {
    method: action === "create" ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res;
}

function ServiceFields({
  initial,
  onChange,
}: {
  initial?: Partial<Service>;
  onChange: (values: { name: string; durationMinutes: string; price: string; isActive: boolean }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [price, setPrice] = useState(initial?.price ? Number(initial.price).toString() : "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const notify = (values: { name: string; durationMinutes: string; price: string; isActive: boolean }) =>
    onChange(values);

  return {
    name, duration, price, isActive,
    fields: (
      <>
        <Input
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); notify({ name: e.target.value, durationMinutes: duration, price, isActive }); }}
          required
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => { setDuration(e.target.value); notify({ name, durationMinutes: e.target.value, price, isActive }); }}
          required
        />
        <Input
          label="Price (ETB)"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => { setPrice(e.target.value); notify({ name, durationMinutes: duration, price: e.target.value, isActive }); }}
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => { setIsActive(e.target.checked); notify({ name, durationMinutes: duration, price, isActive: e.target.checked }); }}
          />
          Active
        </label>
      </>
    ),
  };
}

export function ServiceForm({ mode, service }: { mode: "create"; service?: undefined } | { mode: "edit"; service: Service }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<{ name: string; durationMinutes: string; price: string; isActive: boolean }>({
    name: service?.name ?? "",
    durationMinutes: service?.durationMinutes?.toString() ?? "",
    price: service?.price ? Number(service.price).toString() : "",
    isActive: service?.isActive ?? true,
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        durationMinutes: Number(values.durationMinutes),
        price: values.price,
        isActive: values.isActive,
      };
      const res = await submit(mode, payload, service?.id);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Save failed (${res.status})`);
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const trigger = mode === "create" ? (
    <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
      + New service
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
      Edit
    </Button>
  );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "create" ? "New service" : "Edit service"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            required
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min={1}
            value={values.durationMinutes}
            onChange={(e) => setValues({ ...values, durationMinutes: e.target.value })}
            required
          />
          <Input
            label="Price (ETB)"
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => setValues({ ...values, price: e.target.value })}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
            />
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
