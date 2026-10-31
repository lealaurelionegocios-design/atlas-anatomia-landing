"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { AlertTriangle, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ClientPicker, type ClientOption } from "@/components/client-picker";
import { calculatePrice, percentToMargin } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import { pricingSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { createQuoteFromPricing } from "../quotes/actions";

type Values = z.input<typeof pricingSchema>;
type Output = z.output<typeof pricingSchema>;

function num(v: unknown): number {
  if (v === "" || v === null || v === undefined) return Number.NaN;
  return Number(v);
}

export function PricingCalculator({
  clients,
  initialClientId,
  defaults,
  currency,
  market,
  serviceTypes,
  terms,
}: {
  clients: ClientOption[];
  initialClientId?: string;
  defaults: { hourlyLabourCost: number; targetMarginPercent: number };
  currency: string;
  market: string;
  serviceTypes: { value: string; label: string }[];
  terms: { quote: string; labour: string; postalCode: string; region: string };
}) {
  const router = useRouter();
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      client_id: initialClientId ?? "",
      service_type: "standard",
      hours: 3,
      hourlyLabourCost: defaults.hourlyLabourCost,
      cleaners: 1,
      supplies: 0,
      travel: 0,
      otherCosts: 0,
      targetMarginPercent: defaults.targetMarginPercent,
      manualPrice: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const w = useWatch({ control: form.control });
  const money = (n: number) => formatMoney(n, currency, market);

  const outcome = useMemo(
    () =>
      calculatePrice({
        hours: num(w.hours),
        hourlyLabourCost: num(w.hourlyLabourCost),
        cleaners: num(w.cleaners),
        supplies: num(w.supplies),
        travel: num(w.travel),
        otherCosts: num(w.otherCosts),
        targetMargin: percentToMargin(num(w.targetMarginPercent)),
        manualPrice: w.manualPrice === "" || w.manualPrice === undefined ? null : num(w.manualPrice),
      }),
    [w],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await createQuoteFromPricing(values);
    if (!res.ok) {
      if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof Values, { message: m });
      toast.error(res.error);
      return;
    }
    toast.success(`${terms.quote} saved as draft`);
    router.push(`/quotes/${res.data.id}`);
  });

  const numberField = (name: keyof Values, label: string, opts: { step?: string; hint?: string; prefix?: string; suffix?: string } = {}) => (
    <Field id={name} label={label} error={errors[name]?.message as string | undefined} hint={opts.hint}>
      {(p) => (
        <div className="relative">
          {opts.prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{opts.prefix}</span>}
          <Input
            {...p}
            type="number"
            inputMode="decimal"
            step={opts.step ?? "0.01"}
            min="0"
            className={cn(opts.prefix && "pl-7", opts.suffix && "pr-8")}
            {...form.register(name)}
          />
          {opts.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{opts.suffix}</span>}
        </div>
      )}
    </Field>
  );
  const sym = currency === "GBP" ? "£" : "$";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Job</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="client_id" label="Client" error={errors.client_id?.message} className="sm:col-span-2" hint="Needed to save the price.">
              {(p) => (
                <Controller
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <ClientPicker
                      id={p.id}
                      invalid={p["aria-invalid"]}
                      describedBy={p["aria-describedby"]}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={clients}
                      terms={terms}
                    />
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
            {numberField("hours", "Estimated hours (per cleaner)", { step: "0.25", suffix: "h" })}
            {numberField("cleaners", "Number of cleaners", { step: "1" })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {numberField("hourlyLabourCost", `${terms.labour} cost per hour`, { prefix: sym, hint: "What you pay yourself or each cleaner per hour." })}
            {numberField("supplies", "Products & supplies", { prefix: sym })}
            {numberField("travel", "Travel", { prefix: sym, hint: "Fuel, parking, tolls or fares." })}
            {numberField("otherCosts", "Other costs", { prefix: sym, hint: "Equipment wear, insurance share, admin." })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {numberField("targetMarginPercent", "Target gross margin", { step: "1", suffix: "%", hint: "Share of the price left after the costs above." })}
            {numberField("manualPrice", "Manual price (optional)", { prefix: sym, hint: "Leave empty to use the suggested price." })}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="overflow-hidden">
            <div className="bg-forest px-5 py-5 text-white">
              <p className="text-sm text-mint/80">{outcome.ok && outcome.result.usesManualPrice ? "Your price" : "Suggested price"}</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums" aria-live="polite" data-testid="final-price">
                {outcome.ok ? money(outcome.result.finalPrice) : "—"}
              </p>
              {outcome.ok && outcome.result.usesManualPrice && (
                <p className="mt-1 text-sm text-mint/80">Suggested: {money(outcome.result.suggestedPrice)}</p>
              )}
              <p className="mt-2 text-xs text-mint/70">No tax included.</p>
            </div>
            <CardContent>
              {outcome.ok ? (
                <dl className="space-y-2 text-sm">
                  {[
                    [`${terms.labour}`, outcome.result.labour],
                    ["Supplies", outcome.result.supplies],
                    ["Travel", outcome.result.travel],
                    ["Other costs", outcome.result.otherCosts],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <dt className="text-muted">{k}</dt>
                      <dd className="tabular-nums">{money(v as number)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-line pt-2 font-medium">
                    <dt>Total estimated costs</dt>
                    <dd className="tabular-nums" data-testid="total-costs">
                      {money(outcome.result.totalCosts)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Target margin</dt>
                    <dd className="tabular-nums">{(outcome.result.targetMargin * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Estimated gross contribution</dt>
                    <dd className={cn("tabular-nums font-medium", outcome.result.grossContribution < 0 && "text-danger")}>
                      {money(outcome.result.grossContribution)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Actual margin</dt>
                    <dd className="tabular-nums">{(outcome.result.actualMargin * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Price per cleaner-hour</dt>
                    <dd className="tabular-nums">{money(outcome.result.revenuePerCleanerHour)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted">Fix the highlighted values to see a price.</p>
              )}
              <Button type="submit" className="mt-5 w-full" loading={isSubmitting} disabled={!outcome.ok}>
                <Save /> Save as {terms.quote.toLowerCase()}
              </Button>
            </CardContent>
          </Card>

          {outcome.ok && outcome.result.warnings.length > 0 && (
            <ul className="space-y-2" aria-label="Pricing notes">
              {outcome.result.warnings.map((wn) => (
                <li
                  key={wn.code}
                  className={cn(
                    "flex gap-2 rounded-lg border px-3 py-2 text-sm",
                    wn.severity === "danger" && "border-danger/20 bg-danger-soft text-danger",
                    wn.severity === "warning" && "border-warning/20 bg-warning-soft text-warning",
                    wn.severity === "info" && "border-line bg-white text-muted",
                  )}
                >
                  {wn.severity === "info" ? <Info className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                  {wn.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </form>
  );
}
