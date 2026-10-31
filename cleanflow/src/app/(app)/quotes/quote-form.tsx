"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ClientPicker, type ClientOption } from "@/components/client-picker";
import { LineItemsEditor } from "@/components/line-items";
import { quoteSchema } from "@/lib/validation";
import { saveQuote } from "./actions";

type Values = z.input<typeof quoteSchema>;
type Output = z.output<typeof quoteSchema>;

export function QuoteForm({
  quoteId,
  defaults,
  clients,
  serviceTypes,
  currency,
  market,
  terms,
}: {
  quoteId?: string;
  defaults: Values;
  clients: ClientOption[];
  serviceTypes: { value: string; label: string }[];
  currency: string;
  market: string;
  terms: { quote: string; postalCode: string; region: string };
}) {
  const router = useRouter();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(quoteSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await saveQuote(quoteId ?? null, values);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.push(`/quotes/${res.data.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{terms.quote} details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="client_id" label="Client" required error={errors.client_id?.message} className="sm:col-span-2">
            {(p) => (
              <Controller
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <ClientPicker id={p.id} invalid={p["aria-invalid"]} value={field.value} onChange={field.onChange} options={clients} terms={terms} />
                )}
              />
            )}
          </Field>
          <Field id="service_type" label="Service type" error={errors.service_type?.message} className="sm:col-span-2">
            {(p) => (
              <Select {...p} {...form.register("service_type")}>
                {serviceTypes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="issue_date" label="Issue date" required error={errors.issue_date?.message}>
            {(p) => <Input {...p} type="date" {...form.register("issue_date")} />}
          </Field>
          <Field id="valid_until" label="Valid until" error={errors.valid_until?.message}>
            {(p) => <Input {...p} type="date" {...form.register("valid_until")} />}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor control={form.control} register={form.register} errors={errors} currency={currency} market={market} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <Field id="notes" label="Notes shown to the client" error={errors.notes?.message} hint="Scope, what's included, access arrangements (no codes).">
            {(p) => <Textarea {...p} rows={4} {...form.register("notes")} />}
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {quoteId ? "Save new version" : `Save ${terms.quote.toLowerCase()}`}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
