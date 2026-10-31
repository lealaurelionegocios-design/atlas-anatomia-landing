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
import { invoiceSchema } from "@/lib/validation";
import { saveInvoice } from "./actions";

type Values = z.input<typeof invoiceSchema>;
type Output = z.output<typeof invoiceSchema>;

export function InvoiceForm({
  invoiceId,
  defaults,
  clients,
  currency,
  market,
  terms,
  lockClient,
}: {
  invoiceId?: string;
  defaults: Values;
  clients: ClientOption[];
  currency: string;
  market: string;
  terms: { postalCode: string; region: string };
  lockClient?: boolean;
}) {
  const router = useRouter();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(invoiceSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const submit = (status: "draft" | "issued") =>
    form.handleSubmit(async (values) => {
      const res = await saveInvoice(invoiceId ?? null, { ...values, status });
      if (!res.ok) return toast.error(res.error);
      toast.success(res.message);
      router.push(`/invoices/${res.data.id}`);
      router.refresh();
    });

  return (
    <form noValidate className="space-y-6" onSubmit={submit("issued")}>
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="client_id" label="Bill to" required error={errors.client_id?.message} className="sm:col-span-2" hint={lockClient ? "Linked to a job — the client cannot change." : undefined}>
            {(p) =>
              lockClient ? (
                <Select {...p} disabled value={defaults.client_id}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Controller
                  control={form.control}
                  name="client_id"
                  render={({ field }) => <ClientPicker id={p.id} invalid={p["aria-invalid"]} value={field.value} onChange={field.onChange} options={clients} terms={terms} />}
                />
              )
            }
          </Field>
          <Field id="issue_date" label="Invoice date" required error={errors.issue_date?.message}>
            {(p) => <Input {...p} type="date" {...form.register("issue_date")} />}
          </Field>
          <Field id="due_date" label="Due date" required error={errors.due_date?.message}>
            {(p) => <Input {...p} type="date" {...form.register("due_date")} />}
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor control={form.control} register={form.register} errors={errors} currency={currency} market={market} />
          <p className="mt-3 text-xs text-muted">No sales tax or VAT is added automatically. If you are registered, add it as a line and include the details your jurisdiction requires.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-5">
          <Field id="notes" label="Notes" error={errors.notes?.message} hint="Shown on the invoice (e.g. payment instructions).">
            {(p) => <Textarea {...p} {...form.register("notes")} />}
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSubmitting}>
          Save & issue
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={submit("draft")}>
          Save as draft
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
