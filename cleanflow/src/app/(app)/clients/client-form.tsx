"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { clientSchema } from "@/lib/validation";
import { saveClient } from "./actions";

type FormValues = z.input<typeof clientSchema>;
type FormOutput = z.output<typeof clientSchema>;

export function ClientForm({
  clientId,
  defaults,
  terms,
  onSaved,
  submitLabel,
}: {
  clientId?: string;
  defaults?: Partial<Record<keyof FormValues, string | null>>;
  terms: { postalCode: string; region: string };
  /** When provided, called instead of navigating to the client page. */
  onSaved?: (id: string, name: string) => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const clean = Object.fromEntries(Object.entries(defaults ?? {}).map(([k, v]) => [k, v ?? ""])) as FormValues;
  const form = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(clientSchema), defaultValues: { ...clean, name: clean.name ?? "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await saveClient(clientId ?? null, values);
    if (!res.ok) {
      if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof FormValues, { message: m });
      toast.error(res.error);
      return;
    }
    toast.success(res.message);
    if (onSaved) onSaved(res.data.id, values.name);
    else {
      router.push(`/clients/${res.data.id}`);
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-forest">Contact</legend>
        <Field id="name" label="Client name" required error={errors.name?.message} className="sm:col-span-2">
          {(p) => <Input {...p} autoComplete="name" {...form.register("name")} />}
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
        </Field>
        <Field id="phone" label="Phone" error={errors.phone?.message}>
          {(p) => <Input {...p} type="tel" autoComplete="tel" {...form.register("phone")} />}
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-forest">Service address</legend>
        <Field id="address_line1" label="Address line 1" error={errors.address_line1?.message} className="sm:col-span-2">
          {(p) => <Input {...p} autoComplete="address-line1" {...form.register("address_line1")} />}
        </Field>
        <Field id="address_line2" label="Address line 2" error={errors.address_line2?.message} className="sm:col-span-2">
          {(p) => <Input {...p} autoComplete="address-line2" {...form.register("address_line2")} />}
        </Field>
        <Field id="city" label="City / town" error={errors.city?.message}>
          {(p) => <Input {...p} autoComplete="address-level2" {...form.register("city")} />}
        </Field>
        <Field id="region" label={terms.region} error={errors.region?.message}>
          {(p) => <Input {...p} autoComplete="address-level1" {...form.register("region")} />}
        </Field>
        <Field id="postal_code" label={terms.postalCode} error={errors.postal_code?.message}>
          {(p) => <Input {...p} autoComplete="postal-code" {...form.register("postal_code")} />}
        </Field>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-sm font-semibold text-forest">Preferences & notes</legend>
        <Field
          id="service_preferences"
          label="Service preferences"
          error={errors.service_preferences?.message}
          hint="Rooms to prioritise, products, pets, preferred days. Do not store alarm codes, key locations or passwords here."
        >
          {(p) => <Textarea {...p} rows={3} {...form.register("service_preferences")} />}
        </Field>
        <Field id="notes" label="Internal notes" error={errors.notes?.message}>
          {(p) => <Textarea {...p} rows={3} {...form.register("notes")} />}
        </Field>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel ?? (clientId ? "Save changes" : "Add client")}
        </Button>
        {!onSaved && (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
