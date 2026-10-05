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
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type ServicesT = Dictionary["admin"]["services"];
type CommonT = Dictionary["admin"]["common"];

async function submit(action: "create" | "edit", payload: Record<string, unknown>, id?: string) {
  const res = await fetch("/api/admin/services" + (id && action === "edit" ? `?id=${id}` : ""), {
    method: action === "create" ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res;
}

type ServiceValues = {
  name: string;
  nameAm: string;
  description: string;
  descriptionAm: string;
  durationMinutes: string;
  price: string;
  isActive: boolean;
};

export function ServiceForm({
  mode,
  service,
  t,
  common,
}: ({ mode: "create"; service?: undefined } | { mode: "edit"; service: Service }) & {
  t: ServicesT;
  common: CommonT;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ServiceValues>({
    name: service?.name ?? "",
    nameAm: service?.nameAm ?? "",
    description: service?.description ?? "",
    descriptionAm: service?.descriptionAm ?? "",
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
        nameAm: values.nameAm,
        description: values.description,
        descriptionAm: values.descriptionAm,
        durationMinutes: Number(values.durationMinutes),
        price: values.price,
        isActive: values.isActive,
      };
      const res = await submit(mode, payload, service?.id);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `${common.saveFailed} (${res.status})`);
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError(common.networkError);
    } finally {
      setLoading(false);
    }
  }

  const trigger = mode === "create" ? (
    <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
      {t.new}
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
      {common.edit}
    </Button>
  );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "create" ? t.newTitle : t.editTitle}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <Input
            label={t.name}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            required
          />
          <Input
            label={t.description}
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            {common.amharic}
          </p>
          <Input
            label={t.nameAm}
            value={values.nameAm}
            onChange={(e) => setValues({ ...values, nameAm: e.target.value })}
          />
          <Input
            label={t.descriptionAm}
            value={values.descriptionAm}
            onChange={(e) => setValues({ ...values, descriptionAm: e.target.value })}
          />
          <Input
            label={t.duration}
            type="number"
            min={1}
            value={values.durationMinutes}
            onChange={(e) => setValues({ ...values, durationMinutes: e.target.value })}
            required
          />
          <Input
            label={t.price}
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
            {t.active}
          </label>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? common.saving : mode === "create" ? common.create : common.save}
          </Button>
        </form>
      </Modal>
    </>
  );
}
