"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ClientPicker, type ClientOption } from "@/components/client-picker";
import { jobSchema } from "@/lib/validation";
import { createJob } from "./actions";

type Values = z.input<typeof jobSchema>;
type Output = z.output<typeof jobSchema>;

export function JobForm({
  defaults,
  clients,
  serviceTypes,
  checklists,
  defaultChecklistByService,
  currencySymbol,
  terms,
}: {
  defaults: Values;
  clients: ClientOption[];
  serviceTypes: { value: string; label: string }[];
  checklists: { slug: string; title: string }[];
  defaultChecklistByService: Record<string, string>;
  currencySymbol: string;
  terms: { postalCode: string; region: string };
}) {
  const router = useRouter();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(jobSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    const res = await createJob(values);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.push(`/jobs/${res.data.id}`);
    router.refresh();
  });
  const serviceReg = form.register("service_type");

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="max-w-3xl">
        <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
          <Field id="client_id" label="Client" required error={errors.client_id?.message} className="sm:col-span-2">
            {(p) => (
              <Controller
                control={form.control}
                name="client_id"
                render={({ field }) => <ClientPicker id={p.id} invalid={p["aria-invalid"]} value={field.value} onChange={field.onChange} options={clients} terms={terms} />}
              />
            )}
          </Field>
          <Field id="service_type" label="Service type" error={errors.service_type?.message}>
            {(p) => (
              <Select
                {...p}
                {...serviceReg}
                onChange={(e) => {
                  serviceReg.onChange(e);
                  const slug = defaultChecklistByService[e.target.value];
                  if (slug) form.setValue("checklist_slug", slug);
                }}
              >
                {serviceTypes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="checklist_slug" label="Checklist" error={errors.checklist_slug?.message}>
            {(p) => (
              <Select {...p} {...form.register("checklist_slug")}>
                {checklists.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
                <option value="none">No checklist</option>
              </Select>
            )}
          </Field>
          <Field id="scheduled_date" label="Date" required error={errors.scheduled_date?.message}>
            {(p) => <Input {...p} type="date" {...form.register("scheduled_date")} />}
          </Field>
          <Field id="start_time" label="Start time" required error={errors.start_time?.message}>
            {(p) => <Input {...p} type="time" {...form.register("start_time")} />}
          </Field>
          <Field id="duration_minutes" label="Duration (minutes)" required error={errors.duration_minutes?.message}>
            {(p) => <Input {...p} type="number" min={15} step={15} {...form.register("duration_minutes")} />}
          </Field>
          <Field id="price" label={`Price (${currencySymbol})`} required error={errors.price?.message}>
            {(p) => <Input {...p} type="number" min={0} step="0.01" inputMode="decimal" {...form.register("price")} />}
          </Field>
          <Field id="execution_notes" label="Notes for the job" error={errors.execution_notes?.message} className="sm:col-span-2" hint="Instructions for the visit. Don't record alarm codes or key locations.">
            {(p) => <Textarea {...p} {...form.register("execution_notes")} />}
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={isSubmitting}>
              Book job
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
