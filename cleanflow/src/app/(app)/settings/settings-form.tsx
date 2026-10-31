"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { businessSettingsSchema } from "@/lib/validation";
import { MARKET_CONFIG, type Market } from "@/lib/market";
import { TIMEZONES } from "@/lib/timezones";
import { updateLogo, updateSettings } from "./actions";

type Values = z.input<typeof businessSettingsSchema>;
type Output = z.output<typeof businessSettingsSchema>;

export function SettingsForm({ defaults, savedCurrency }: { defaults: Values; savedCurrency: string }) {
  const router = useRouter();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(businessSettingsSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const currency = useWatch({ control: form.control, name: "currency" });
  const marketReg = form.register("market");

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await updateSettings(values);
    if (!res.ok) {
      if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof Values, { message: m });
      return toast.error(res.error);
    }
    toast.success(res.message);
    form.setValue("confirm_currency_change", false);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Business name" required error={errors.name?.message}>
            {(p) => <Input {...p} {...form.register("name")} />}
          </Field>
          <Field id="owner_name" label="Owner name" error={errors.owner_name?.message}>
            {(p) => <Input {...p} {...form.register("owner_name")} />}
          </Field>
          <Field id="email" label="Business email" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" {...form.register("email")} />}
          </Field>
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            {(p) => <Input {...p} type="tel" {...form.register("phone")} />}
          </Field>
          <Field id="address" label="Business address" error={errors.address?.message} className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={2} {...form.register("address")} />}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market & localisation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="market" label="Market" error={errors.market?.message} hint="Controls terminology (Estimate/Quote), service types, paper size and checklists.">
            {(p) => (
              <Select
                {...p}
                {...marketReg}
                onChange={(e) => {
                  marketReg.onChange(e);
                  const cfg = MARKET_CONFIG[e.target.value as Market];
                  form.setValue("date_format", cfg.defaultDateFormat);
                  form.setValue("timezone", cfg.defaultTimezone);
                }}
              >
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
              </Select>
            )}
          </Field>
          <Field id="currency" label="Currency" error={errors.currency?.message}>
            {(p) => (
              <Select {...p} {...form.register("currency")}>
                <option value="USD">US Dollar (USD)</option>
                <option value="GBP">Pound sterling (GBP)</option>
              </Select>
            )}
          </Field>
          <Field id="date_format" label="Date format" error={errors.date_format?.message}>
            {(p) => (
              <Select {...p} {...form.register("date_format")}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Select>
            )}
          </Field>
          <Field id="timezone" label="Time zone" error={errors.timezone?.message}>
            {(p) => (
              <Select {...p} {...form.register("timezone")}>
                {TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {currency !== savedCurrency && (
            <div className="sm:col-span-2">
              <Alert tone="warning" title="Changing currency">
                Existing estimates/quotes, jobs, invoices, payments and expenses keep their original currency ({savedCurrency}). Nothing is converted. New records will use {currency}.
                Totals on the dashboard only include records in the current currency.
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input type="checkbox" className="size-4 accent-[#22694E]" {...form.register("confirm_currency_change")} /> I understand — change the currency
                </label>
                {errors.confirm_currency_change && <p className="mt-1 text-danger">{errors.confirm_currency_change.message}</p>}
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing defaults & documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="default_hourly_cost" label="Default hourly labour cost" error={errors.default_hourly_cost?.message}>
            {(p) => <Input {...p} type="number" step="0.01" min="0" {...form.register("default_hourly_cost")} />}
          </Field>
          <Field id="default_target_margin_percent" label="Default target margin (%)" error={errors.default_target_margin_percent?.message}>
            {(p) => <Input {...p} type="number" step="1" min="0" max="95" {...form.register("default_target_margin_percent")} />}
          </Field>
          <Field id="quote_prefix" label="Estimate / quote number prefix" error={errors.quote_prefix?.message}>
            {(p) => <Input {...p} {...form.register("quote_prefix")} />}
          </Field>
          <Field id="invoice_prefix" label="Invoice number prefix" error={errors.invoice_prefix?.message}>
            {(p) => <Input {...p} {...form.register("invoice_prefix")} />}
          </Field>
          <Field id="payment_terms_days" label="Payment terms (days)" error={errors.payment_terms_days?.message}>
            {(p) => <Input {...p} type="number" min="0" max="120" {...form.register("payment_terms_days")} />}
          </Field>
          <Field id="invoice_footer" label="Invoice footer (optional)" error={errors.invoice_footer?.message} className="sm:col-span-2" hint="e.g. bank details or a thank-you note. Shown at the bottom of invoices.">
            {(p) => <Textarea {...p} rows={2} {...form.register("invoice_footer")} />}
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" loading={isSubmitting}>
        Save settings
      </Button>
    </form>
  );
}

/** Resizes an uploaded image to fit 400×400 and stores it as a data URL. */
export function LogoUploader({ current }: { current: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleFile(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.error("Use a PNG, JPEG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image is too large (max 5 MB before resizing).");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setPending(true);
    const res = await updateLogo(dataUrl);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Business logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted">No logo</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" loading={pending}>
          <label className="cursor-pointer">
            <ImageUp /> Upload logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {current && (
          <Button
            variant="ghost"
            onClick={async () => {
              const res = await updateLogo(null);
              if (!res.ok) return toast.error(res.error);
              toast.success(res.message);
              router.refresh();
            }}
          >
            <Trash2 /> Remove
          </Button>
        )}
      </div>
      <p className="w-full text-xs text-muted">Shown on estimates/quotes, invoices and kit documents. PNG, JPEG or WebP.</p>
    </div>
  );
}
