"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, CircleCheck, Info, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { NumberInput, Select } from "@/components/ui/input";
import { EmptyState, MarginPill, Notice, PageHeader } from "@/components/ui/misc";
import { D, fromCents, type Dec } from "@/lib/calc/decimal";
import { calcPricing, type PriceEvaluation } from "@/lib/calc/pricing";
import { calcRecipeCost, indexIngredients } from "@/lib/calc/recipe";
import { upsertRecipe } from "@/lib/domain/actions";
import type { Recipe, RoundingMode, RoundingStep } from "@/lib/domain/types";
import { formatEUR, formatEURSigned, formatNumber, formatPercent } from "@/lib/i18n/format";
import { useStore } from "@/lib/store/AppStore";
import { centsToInput, numberToInput, parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";
import { cn } from "@/lib/utils/cn";

export function CalculatorPage() {
  const { data, m } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const t = m.calculator;
  const sorted = useMemo(() => [...data.recipes].sort((a, b) => a.name.localeCompare(b.name, "it")), [data.recipes]);
  const requested = params.get("ricetta");
  const recipe = sorted.find((r) => r.id === requested) ?? sorted[0] ?? null;

  if (!recipe)
    return (
      <>
        <PageHeader title={t.title} subtitle={t.subtitle} icon={Calculator} />
        <EmptyState icon={Calculator} title={t.noRecipes} action={<Button asChild><Link href={data.ingredients.length ? "/ricette/modifica/" : "/ingredienti/"}>{data.ingredients.length ? m.recipes.add : m.dashboard.newIngredient}</Link></Button>} />
      </>
    );

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} icon={Calculator} />
      <div className="mb-5 max-w-md">
        <Field id="calc-recipe" label={t.selectRecipe}>
          <Select id="calc-recipe" value={recipe.id} onChange={(e) => router.replace(`/calcolatore/?ricetta=${encodeURIComponent(e.target.value)}`)}>
            {sorted.map((r) => <option key={r.id} value={r.id}>{r.name}{r.isDemo ? ` — ${m.common.demo}` : ""}</option>)}
          </Select>
        </Field>
      </div>
      <CalculatorBody key={recipe.id} recipe={recipe} />
    </>
  );
}

function CalculatorBody({ recipe }: { recipe: Recipe }) {
  const { data, update, m } = useStore();
  const t = m.calculator;
  const s = data.settings;
  const [yieldQty, setYieldQty] = useState(numberToInput(recipe.yieldQuantity));
  const [margin, setMargin] = useState(numberToInput(recipe.targetMarginPercent ?? s.defaultMarginPercent));
  const [fees, setFees] = useState(numberToInput(s.defaultFeePercent));
  const [vat, setVat] = useState(numberToInput(s.vatPercent));
  const [fixed, setFixed] = useState(centsToInput(s.defaultFixedCostPerBatchCents));
  const [compare, setCompare] = useState(centsToInput(recipe.currentPriceCents));
  const [step, setStep] = useState<RoundingStep>(s.roundingStepCents);
  const [mode, setMode] = useState<RoundingMode>(s.roundingMode);

  const v = m.validation;
  const yN = parseLocaleNumber(yieldQty);
  const mN = parseLocaleNumber(margin);
  const fN = fees.trim() ? parseLocaleNumber(fees) : 0;
  const vN = vat.trim() ? parseLocaleNumber(vat) : 0;
  const fixC = fixed.trim() ? parseEuroToCents(fixed) : 0;
  const cmpC = compare.trim() ? parseEuroToCents(compare) : null;
  const errors = {
    yield: yN == null ? v.number : yN <= 0 ? v.positive : null,
    margin: mN == null ? v.number : mN < 0 || mN >= 100 ? v.percent : null,
    fees: fN == null ? v.number : fN < 0 || fN >= 100 ? v.percent : null,
    vat: vN == null ? v.number : vN < 0 || vN > 100 ? v.vat : null,
    fixed: fixC == null ? v.number : fixC < 0 ? v.nonNegative : null,
    compare: compare.trim() && (cmpC == null || cmpC < 0) ? v.number : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const idx = useMemo(() => indexIngredients(data.ingredients), [data.ingredients]);
  const cost = useMemo(() => calcRecipeCost(recipe, idx, { yieldOverride: yN && yN > 0 ? yN : recipe.yieldQuantity }), [recipe, idx, yN]);

  const result = useMemo(() => {
    if (hasErrors || cost.unitCost == null) return null;
    return calcPricing({
      unitCost: cost.unitCost,
      yieldQuantity: cost.yieldQuantity,
      fixedCostPerBatch: fromCents(fixC!),
      marginPercent: mN!,
      feePercent: fN!,
      vatPercent: vN!,
      roundingStepCents: step,
      roundingMode: mode,
      comparePrice: cmpC != null ? fromCents(cmpC) : null,
    });
  }, [hasErrors, cost, fixC, mN, fN, vN, step, mode, cmpC]);

  const unitLabel = recipe.yieldUnit || "unità";
  const pct = (d: Dec | null) => (d == null ? null : d.toNumber());

  const saveToRecipe = () => {
    if (mN == null || errors.margin) return;
    update((d) => {
      const cur = d.recipes.find((r) => r.id === recipe.id);
      if (!cur) return d;
      return upsertRecipe(d, { ...cur, targetMarginPercent: mN, currentPriceCents: cmpC ?? cur.currentPriceCents }).data;
    });
    toast.success(t.savedToRecipe);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr] [&>*]:min-w-0">
      {/* Parametri */}
      <Card className="xl:self-start">
        <CardHeader><CardTitle>{t.inputs}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field id="c-yield" label={`${t.yield} (${unitLabel})`} error={errors.yield} hint={t.yieldHint}>
            <NumberInput {...fieldAria("c-yield", errors.yield, true)} value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} />
          </Field>
          <Field id="c-margin" label={t.margin} error={errors.margin} hint={t.marginHint}>
            <NumberInput {...fieldAria("c-margin", errors.margin, true)} value={margin} onChange={(e) => setMargin(e.target.value)} suffix="%" />
          </Field>
          <input
            type="range" min={0} max={90} step={1} value={mN != null && mN >= 0 && mN <= 90 ? mN : 0}
            onChange={(e) => setMargin(e.target.value)} className="w-full accent-wine" aria-label={t.margin}
          />
          <Field id="c-fees" label={t.fees} error={errors.fees} hint={t.feesHint}>
            <NumberInput {...fieldAria("c-fees", errors.fees, true)} value={fees} onChange={(e) => setFees(e.target.value)} suffix="%" />
          </Field>
          <Field id="c-vat" label={t.vat} error={errors.vat} hint={t.vatHint}>
            <NumberInput {...fieldAria("c-vat", errors.vat, true)} value={vat} onChange={(e) => setVat(e.target.value)} suffix="%" />
          </Field>
          <Field id="c-fixed" label={t.fixed} error={errors.fixed} hint={t.fixedHint}>
            <NumberInput {...fieldAria("c-fixed", errors.fixed, true)} value={fixed} onChange={(e) => setFixed(e.target.value)} suffix="€" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="c-step" label={t.rounding}>
              <Select id="c-step" value={step} onChange={(e) => setStep(Number(e.target.value) as RoundingStep)}>
                {([1, 5, 10, 50, 100] as const).map((x) => <option key={x} value={x}>{m.rounding[x]}</option>)}
              </Select>
            </Field>
            <Field id="c-mode" label={m.settings.roundingMode}>
              <Select id="c-mode" value={mode} onChange={(e) => setMode(e.target.value as RoundingMode)}>
                <option value="up">{m.rounding.up}</option>
                <option value="nearest">{m.rounding.nearest}</option>
              </Select>
            </Field>
          </div>
          <div className="rounded-xl bg-cream p-3">
            <Field id="c-compare" label={t.compare} error={errors.compare} hint={t.compareHint}>
              <NumberInput {...fieldAria("c-compare", errors.compare, true)} value={compare} onChange={(e) => setCompare(e.target.value)} placeholder={t.comparePh} suffix="€" />
            </Field>
            {result?.ok && (
              <Button type="button" variant="link" size="sm" className="mt-1" onClick={() => setCompare(centsToInput(result.suggested.gross.mul(100).round().toNumber()))}>
                {t.useSuggested}
              </Button>
            )}
          </div>
          <div className="border-t border-line pt-4">
            <Button type="button" className="w-full" onClick={saveToRecipe} disabled={!!errors.margin || !!errors.compare}>
              <Save /> {t.saveToRecipe}
            </Button>
            <p className="mt-2 text-xs text-ink-muted">{t.saveToRecipeHint}</p>
          </div>
        </CardContent>
      </Card>

      {/* Risultati */}
      <div className="space-y-6">
        {!cost.complete && (
          <Notice tone="warn" icon={AlertTriangle}>
            {t.incompleteRecipe}{" "}
            <Link href={`/ricette/modifica/?id=${encodeURIComponent(recipe.id)}`} className="font-medium underline">{m.common.edit}</Link>
          </Notice>
        )}
        {result && !result.ok && <Notice tone="bad" icon={AlertTriangle}>{m.pricingErrors[result.error]}</Notice>}
        {hasErrors && <Notice tone="bad" icon={AlertTriangle}>{m.validation.fixErrors}</Notice>}

        {result?.ok && (
          <>
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-wine to-wine-dark p-6 text-white shadow-lift">
                <Sparkles className="absolute -right-3 -top-3 size-24 text-white/5" aria-hidden />
                <p className="text-sm text-rose-light">{t.suggested}</p>
                <p className="mt-1 font-serif text-5xl font-semibold tabular-nums" aria-live="polite">{formatEUR(result.suggested.gross)}</p>
                <p className="mt-1 text-sm text-rose-light">{t.suggestedPerUnit(unitLabel)}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-rose-light/90">
                  <span>{t.exact(formatEUR(result.exactPrice))}</span>
                  {!result.suggested.vat.isZero() && <span>{t.vatIncluded(formatEUR(result.suggested.vat))}</span>}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-rose-light">{t.marginPct}</p>
                    <p className="text-lg font-semibold tabular-nums">{formatPercent(pct(result.suggested.marginPercent))}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-rose-light">{t.markupPct}</p>
                    <p className="text-lg font-semibold tabular-nums">{formatPercent(pct(result.suggested.markupPercent))}</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader><CardTitle>{t.costs}</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <Row label={t.recipeCost} value={formatEUR(cost.totalCost)} />
                    <Row label={t.fixedAlloc} value={formatEUR(result.fixedCostPerUnit.mul(cost.yieldQuantity))} />
                    <Row label={t.totalCost} value={formatEUR(result.batchCost)} strong />
                    <Row label={`${t.yield}`} value={`${formatNumber(cost.yieldQuantity, 2)} ${unitLabel}`} />
                    <div className="border-t border-line pt-2">
                      <Row label={t.unitCost} value={formatEUR(result.fullUnitCost)} strong accent />
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>{t.breakdown}</CardTitle></CardHeader>
              <CardContent>
                <PriceBar e={result.suggested} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t.comparison}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                        <th scope="col" className="py-2 font-semibold"><span className="sr-only">—</span></th>
                        <th scope="col" className="py-2 text-right font-semibold">{t.suggested}</th>
                        <th scope="col" className="py-2 text-right font-semibold">{t.alt}</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      <CmpRow label={m.reports.colPrice2} a={result.suggested.gross} b={result.compare?.gross} />
                      <CmpRow label={t.netPrice} a={result.suggested.net} b={result.compare?.net} />
                      <CmpRow label={t.feesAmount} a={result.suggested.fees} b={result.compare?.fees} />
                      <CmpRow label={t.unitCost} a={result.suggested.cost} b={result.compare?.cost} />
                      <CmpRow label={t.contribution} a={result.suggested.contribution} b={result.compare?.contribution} strong />
                      <CmpRow label={t.contributionPerBatch} a={result.suggestedBatchContribution} b={result.compareBatchContribution} />
                      <tr className="border-t border-line/60">
                        <th scope="row" className="py-2 text-left font-normal text-ink-muted">{t.marginPct}</th>
                        <td className="py-2 text-right"><MarginPill value={pct(result.suggested.marginPercent)} label={formatPercent(pct(result.suggested.marginPercent))} /></td>
                        <td className="py-2 text-right">
                          {result.compare ? <MarginPill value={pct(result.compare.marginPercent)} target={mN!} label={formatPercent(pct(result.compare.marginPercent))} /> : "—"}
                        </td>
                      </tr>
                      <tr className="border-t border-line/60">
                        <th scope="row" className="py-2 text-left font-normal text-ink-muted">{t.markupPct}</th>
                        <td className="py-2 text-right">{formatPercent(pct(result.suggested.markupPercent))}</td>
                        <td className="py-2 text-right">{result.compare ? formatPercent(pct(result.compare.markupPercent)) : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {result.compare && result.priceDifference && (
                  <div className="mt-4 space-y-2">
                    <p className="flex items-center gap-1.5 text-sm">
                      {result.priceDifference.isNegative() ? <ArrowDownRight className="size-4 text-warn" aria-hidden /> : <ArrowUpRight className="size-4 text-sage-dark" aria-hidden />}
                      {t.difference}: <strong className="tabular-nums">{formatEURSigned(result.priceDifference)}</strong>
                    </p>
                    <CompareVerdict e={result.compare} target={mN!} />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Notice icon={Info}>
                <p className="font-medium">{t.marginVsMarkup}</p>
                <p className="mt-0.5 text-ink-muted">{t.marginVsMarkupBody}</p>
              </Notice>
              <Notice icon={Info}>
                <p className="font-medium">{t.formula}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-muted">{t.formulaText}</p>
                <p className="mt-1 text-xs text-ink-muted">{t.contributionNote}</p>
              </Notice>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className={cn("text-ink-muted", strong && "font-medium text-ink")}>{label}</dt>
      <dd className={cn("tabular-nums", strong && "font-semibold", accent && "text-wine")}>{value}</dd>
    </div>
  );
}

function CmpRow({ label, a, b, strong }: { label: string; a: Dec; b?: Dec | null; strong?: boolean }) {
  const neg = (d?: Dec | null) => d && d.isNegative() && !d.isZero();
  return (
    <tr className="border-t border-line/60">
      <th scope="row" className={cn("py-2 text-left font-normal text-ink-muted", strong && "font-medium text-ink")}>{label}</th>
      <td className={cn("py-2 text-right", strong && "font-semibold", neg(a) && "text-danger")}>{formatEUR(a)}</td>
      <td className={cn("py-2 text-right", strong && "font-semibold", neg(b) && "text-danger")}>{b ? formatEUR(b) : "—"}</td>
    </tr>
  );
}

function CompareVerdict({ e, target }: { e: PriceEvaluation; target: number }) {
  const { m } = useStore();
  const t = m.calculator;
  if (e.contribution.isNegative()) return <Notice tone="bad" icon={AlertTriangle}>{t.belowCost}</Notice>;
  if (e.marginPercent && e.marginPercent.lt(new D(target).minus(0.05))) return <Notice tone="warn" icon={AlertTriangle}>{t.belowTarget}</Notice>;
  return <Notice tone="good" icon={CircleCheck}>{t.aboveTarget}</Notice>;
}

/** Barra orizzontale: come si compone il prezzo al cliente. Etichette sempre visibili (non solo colore). */
function PriceBar({ e }: { e: PriceEvaluation }) {
  const { m } = useStore();
  const t = m.calculator;
  const parts = [
    { label: t.bdCost, v: e.cost, cls: "bg-[#A3324F]" },
    { label: t.bdFees, v: e.fees, cls: "bg-[#C9772F]" },
    { label: t.bdContribution, v: e.contribution, cls: "bg-[#3A8A5A]" },
    { label: t.bdVat, v: e.vat, cls: "bg-[#5C6FC4]" },
  ].filter((p) => p.v.gt(0));
  const total = parts.reduce((a, p) => a.plus(p.v), new D(0));
  if (total.isZero()) return null;
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${formatEUR(p.v)}`).join(", ")}>
        {parts.map((p) => (
          <div key={p.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", p.cls)} style={{ width: `${p.v.div(total).mul(100).toNumber()}%` }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", p.cls)} aria-hidden />
            <span>
              <span className="block text-ink-muted">{p.label}</span>
              <span className="font-medium tabular-nums">{formatEUR(p.v)}</span>
              <span className="ml-1 text-xs text-ink-subtle">({formatPercent(p.v.div(total).mul(100), 0)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
