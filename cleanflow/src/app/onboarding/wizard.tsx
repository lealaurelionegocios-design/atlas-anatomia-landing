"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowRight, Calculator, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ClientForm } from "@/app/(app)/clients/client-form";
import { DemoDataButton } from "@/components/demo-data-button";
import { onboardingBusinessSchema } from "@/lib/validation";
import { MARKET_CONFIG, type Market } from "@/lib/market";
import { TIMEZONES } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import { completeOnboarding, createBusinessFromOnboarding } from "./actions";

type Values = z.input<typeof onboardingBusinessSchema>;
type Output = z.output<typeof onboardingBusinessSchema>;

const STEPS = ["Welcome", "Market", "Business details", "Pricing defaults", "First client", "First quote"];

export function OnboardingWizard({
  email,
  hasBusiness,
  terms,
  firstClient,
}: {
  email: string;
  hasBusiness: boolean;
  terms: { quote: string; postalCode: string; region: string };
  firstClient: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(hasBusiness ? (firstClient ? 5 : 4) : 0);
  const [client, setClient] = useState(firstClient);
  const [localTerms, setLocalTerms] = useState(terms);
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(onboardingBusinessSchema),
    defaultValues: { name: "", owner_name: "", email, phone: "", address: "", market: "US", timezone: "America/New_York", default_hourly_cost: 20, default_target_margin_percent: 35 },
  });
  const { errors, isSubmitting } = form.formState;
  const market = form.watch("market") as Market;

  const next = async (fields: (keyof Values)[]) => {
    if (await form.trigger(fields)) setStep((s) => s + 1);
  };

  const createBusiness = form.handleSubmit(async (values) => {
    const res = await createBusinessFromOnboarding(values);
    if (!res.ok) {
      if (res.fieldErrors) for (const [k, m] of Object.entries(res.fieldErrors)) form.setError(k as keyof Values, { message: m });
      return toast.error(res.error);
    }
    setLocalTerms(MARKET_CONFIG[values.market].terms);
    toast.success("Your business is set up");
    setStep(4);
    router.refresh();
  });

  const finish = async (href: string) => {
    await completeOnboarding();
    router.push(href);
    router.refresh();
  };

  return (
    <div>
      <ol className="mb-8 grid grid-cols-6 gap-1.5" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="text-center">
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} aria-hidden />
            <span className={cn("mt-1.5 hidden text-[11px] sm:block", i === step ? "font-medium text-forest" : "text-muted")}>{label}</span>
            <span className="sr-only">
              {label} {i < step ? "(done)" : i === step ? "(current)" : ""}
            </span>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="py-8">
          {step === 0 && (
            <section aria-labelledby="s0">
              <h1 id="s0" className="text-2xl font-semibold">
                Welcome to CleanFlow
              </h1>
              <p className="mt-2 text-muted">Manage your cleaning business without complicated software. In a few minutes you&apos;ll have:</p>
              <ul className="mt-4 space-y-2 text-sm">
                {["Your business details on every document", "A pricing calculator using your own costs", "Your first client and estimate/quote ready to send"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="size-5 shrink-0 text-brand" /> {t}
                  </li>
                ))}
              </ul>
              <Button className="mt-6" onClick={() => setStep(1)}>
                Get started <ArrowRight />
              </Button>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="s1">
              <h1 id="s1" className="text-2xl font-semibold">
                Choose your market
              </h1>
              <p className="mt-2 text-muted">This sets currency, date format, paper size and terminology. You can change it later in Settings.</p>
              <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Market</legend>
                {(["US", "UK"] as const).map((m) => {
                  const cfg = MARKET_CONFIG[m];
                  return (
                    <label key={m} className={cn("cursor-pointer rounded-xl border p-4 transition-colors", market === m ? "border-brand bg-mint/50" : "border-line hover:bg-canvas")}>
                      <input
                        type="radio"
                        value={m}
                        className="sr-only"
                        {...form.register("market", { onChange: () => form.setValue("timezone", cfg.defaultTimezone) })}
                      />
                      <span className="block font-semibold text-forest">{m === "US" ? "United States" : "United Kingdom"}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {cfg.defaultCurrency} · {cfg.defaultDateFormat} · {cfg.paper === "A4" ? "A4" : "US Letter"} · “{cfg.terms.quote}”
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <Field id="timezone" label="Time zone" className="mt-4">
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
              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={() => next(["market", "timezone"])}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="s2">
              <h1 id="s2" className="text-2xl font-semibold">
                Add your business details
              </h1>
              <p className="mt-2 text-muted">These appear on your {MARKET_CONFIG[market].terms.quotes.toLowerCase()}, invoices and documents.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Business name" required error={errors.name?.message} className="sm:col-span-2">
                  {(p) => <Input {...p} {...form.register("name")} autoFocus />}
                </Field>
                <Field id="owner_name" label="Your name" error={errors.owner_name?.message}>
                  {(p) => <Input {...p} {...form.register("owner_name")} />}
                </Field>
                <Field id="phone" label="Phone" error={errors.phone?.message}>
                  {(p) => <Input {...p} type="tel" {...form.register("phone")} />}
                </Field>
                <Field id="email" label="Business email" error={errors.email?.message} className="sm:col-span-2">
                  {(p) => <Input {...p} type="email" {...form.register("email")} />}
                </Field>
                <Field id="address" label="Business address" error={errors.address?.message} className="sm:col-span-2">
                  {(p) => <Textarea {...p} rows={2} {...form.register("address")} />}
                </Field>
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => next(["name", "owner_name", "email", "phone", "address"])}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="s3">
              <h1 id="s3" className="text-2xl font-semibold">
                Set your pricing defaults
              </h1>
              <p className="mt-2 text-muted">The calculator starts from these. You can adjust them on every job.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field id="default_hourly_cost" label={`Hourly ${MARKET_CONFIG[market].terms.labour.toLowerCase()} cost (${market === "UK" ? "£" : "$"})`} error={errors.default_hourly_cost?.message} hint="What you pay yourself or a cleaner per hour.">
                  {(p) => <Input {...p} type="number" step="0.5" min="0" {...form.register("default_hourly_cost")} />}
                </Field>
                <Field id="default_target_margin_percent" label="Target gross margin (%)" error={errors.default_target_margin_percent?.message} hint="Many small cleaning businesses aim for 30–50%.">
                  {(p) => <Input {...p} type="number" step="1" min="0" max="95" {...form.register("default_target_margin_percent")} />}
                </Field>
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={createBusiness} loading={isSubmitting}>
                  Create my business <ArrowRight />
                </Button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="s4">
              <h1 id="s4" className="text-2xl font-semibold">
                Add your first client
              </h1>
              <p className="mb-6 mt-2 text-muted">Just a name is enough to start — you can fill in the rest later.</p>
              <ClientForm
                terms={localTerms}
                submitLabel="Save client and continue"
                onSaved={(id, name) => {
                  setClient({ id, name });
                  setStep(5);
                }}
              />
              <Button variant="link" className="mt-4" onClick={() => setStep(5)}>
                Skip for now
              </Button>
            </section>
          )}

          {step === 5 && (
            <section aria-labelledby="s5">
              <h1 id="s5" className="text-2xl font-semibold">
                Create your first {localTerms.quote.toLowerCase()}
              </h1>
              <p className="mt-2 text-muted">
                {client
                  ? `Price a job for ${client.name} using your costs, then save it as a ${localTerms.quote.toLowerCase()}.`
                  : `Use the pricing calculator to work out a fair price, then save it as a ${localTerms.quote.toLowerCase()}.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => finish(client ? `/pricing?clientId=${client.id}` : "/pricing")}>
                  <Calculator /> Open the pricing calculator
                </Button>
                <Button variant="outline" onClick={() => finish("/dashboard")}>
                  Go to my dashboard
                </Button>
              </div>
              <div className="mt-8 rounded-xl border border-dashed border-line p-4">
                <p className="flex items-center gap-2 font-medium">
                  <Sparkles className="size-4 text-brand" /> Want to look around first?
                </p>
                <p className="mb-3 mt-1 text-sm text-muted">Load fictional demo records (clearly marked and removable in one click from Settings → Data).</p>
                <DemoDataButton mode="load" onDone={() => void finish("/dashboard")} />
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
