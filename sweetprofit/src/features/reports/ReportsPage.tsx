"use client";

import { Download, Printer, ScrollText } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CostStackChart } from "@/components/charts/CostStackChart";
import { AXIS, SERIES } from "@/components/charts/palette";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState, MarginPill, PageHeader } from "@/components/ui/misc";
import { ingredientContributions, summarizeAll } from "@/lib/calc/analytics";
import { fromCents } from "@/lib/calc/decimal";
import { costPerBaseUnit, priceSeries } from "@/lib/calc/ingredient";
import { calcPricing, marginLadder } from "@/lib/calc/pricing";
import { baseUnitOf } from "@/lib/calc/units";
import { csvNumber, formatDate, formatEUR, formatPercent, formatUnitCost } from "@/lib/i18n/format";
import { useStore } from "@/lib/store/AppStore";
import { downloadText, toCsv } from "@/lib/utils/csv";

const stamp = () => new Date().toISOString().slice(0, 10);
const csvFile = (name: string, headers: string[], rows: (string | number | null)[][]) =>
  downloadText(`sweetprofit-${name}-${stamp()}.csv`, toCsv(headers, rows));

function Section({ title, hint, onCsv, children, csvLabel }: { title: string; hint?: string; onCsv?: () => void; children: ReactNode; csvLabel: string }) {
  return (
    <Card className="print:break-inside-avoid print:shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {hint && <CardDescription>{hint}</CardDescription>}
        </div>
        {onCsv && (
          <Button variant="outline" size="sm" onClick={onCsv} className="shrink-0 print:hidden"><Download /> {csvLabel}</Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">{children}</CardContent>
    </Card>
  );
}

const th = "border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted whitespace-nowrap";
const td = "border-b border-line/60 px-3 py-2 tabular-nums";

export function ReportsPage() {
  const { data, m } = useStore();
  const t = m.reports;
  const s = data.settings;
  const summaries = useMemo(() => summarizeAll(data), [data]);
  const contributions = useMemo(() => ingredientContributions(summaries).slice(0, 10), [summaries]);
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id ?? "");
  const withHistory = useMemo(() => data.ingredients.filter((i) => i.priceHistory.length > 0).sort((a, b) => a.name.localeCompare(b.name, "it")), [data.ingredients]);
  const [ingId, setIngId] = useState(withHistory[0]?.id ?? "");

  if (data.recipes.length === 0)
    return (
      <>
        <PageHeader title={t.title} subtitle={t.subtitle} icon={ScrollText} />
        <EmptyState icon={ScrollText} title={t.noData} />
      </>
    );

  // Margini
  const marginRows = summaries.map((x) => ({
    name: x.recipe.name,
    planned: x.pricing.ok ? x.pricing.suggested.marginPercent?.toNumber() ?? null : null,
    target: x.targetMarginPercent,
    current: x.currentMarginPercent?.toNumber() ?? null,
  }));

  // Prezzi a confronto
  const sel = summaries.find((x) => x.recipe.id === recipeId) ?? summaries[0];
  const ladder = sel.cost.unitCost
    ? marginLadder(sel.targetMarginPercent).map((mg) => ({
        margin: mg,
        r: calcPricing({
          unitCost: sel.cost.unitCost!, yieldQuantity: sel.cost.yieldQuantity, fixedCostPerBatch: fromCents(s.defaultFixedCostPerBatchCents),
          marginPercent: mg, feePercent: s.defaultFeePercent, vatPercent: s.vatPercent, roundingStepCents: s.roundingStepCents, roundingMode: s.roundingMode,
        }),
      }))
    : [];
  const currentEval = sel.pricing.ok ? sel.pricing.compare : null;

  // Storico prezzi
  const ing = withHistory.find((i) => i.id === ingId) ?? withHistory[0];
  const series = ing ? priceSeries(ing) : [];
  const unit = ing ? baseUnitOf(ing.purchaseUnit) : "g";
  // Valori per chilo/litro nel grafico: più leggibili di 0,0018 €/g
  const scale = unit === "pz" ? 1 : 1000;
  const scaleUnit = unit === "g" ? "kg" : unit === "ml" ? "l" : "pz";
  const histRows = series.map((p) => ({ date: formatDate(p.date), value: p.costPerBase.mul(scale).toNumber(), raw: p }));
  const variation =
    series.length > 1 && !series[0].costPerBase.isZero()
      ? series[series.length - 1].costPerBase.div(series[0].costPerBase).minus(1).mul(100)
      : null;

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        icon={ScrollText}
        actions={<Button variant="outline" onClick={() => window.print()}><Printer /> {m.common.print}</Button>}
      />
      <p className="mb-4 hidden text-sm text-ink-muted print:block">
        {data.settings.businessName && <strong>{data.settings.businessName} · </strong>}
        {t.printedOn(formatDate(new Date().toISOString()))}
      </p>

      <div className="space-y-6">
        {/* 1. Costi per ricetta */}
        <Section
          title={t.costs} hint={t.costsHint} csvLabel={m.common.exportCsv}
          onCsv={() =>
            csvFile("costi", [t.colRecipe, m.recipes.yield, m.costParts.ingredients, m.costParts.waste, m.costParts.labor, m.costParts.packaging, m.costParts.other, t.colTotal, t.colUnit], summaries.map((x) => [
              x.recipe.name, `${csvNumber(x.recipe.yieldQuantity, 3)} ${x.recipe.yieldUnit}`, csvNumber(x.cost.ingredientsCost), csvNumber(x.cost.wasteCost),
              csvNumber(x.cost.laborCost), csvNumber(x.cost.packagingCost), csvNumber(x.cost.otherCost), csvNumber(x.cost.totalCost), csvNumber(x.cost.unitCost),
            ]))
          }
        >
          <CostStackChart summaries={summaries} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr>
                <th scope="col" className={th}>{t.colRecipe}</th>
                <th scope="col" className={th + " text-right"}>{t.colIngredientsWaste}</th>
                <th scope="col" className={th + " text-right"}>{m.costParts.labor}</th>
                <th scope="col" className={th + " text-right"}>{t.colPackagingOther}</th>
                <th scope="col" className={th + " text-right"}>{t.colTotal}</th>
                <th scope="col" className={th + " text-right"}>{t.colUnit}</th>
              </tr></thead>
              <tbody>
                {summaries.map((x) => (
                  <tr key={x.recipe.id}>
                    <th scope="row" className={td + " text-left font-medium"}>{x.recipe.name}</th>
                    <td className={td + " text-right"}>{formatEUR(x.cost.ingredientsCost.plus(x.cost.wasteCost))}</td>
                    <td className={td + " text-right"}>{formatEUR(x.cost.laborCost)}</td>
                    <td className={td + " text-right"}>{formatEUR(x.cost.packagingCost.plus(x.cost.otherCost))}</td>
                    <td className={td + " text-right font-medium"}>{formatEUR(x.cost.totalCost)}</td>
                    <td className={td + " text-right font-semibold text-wine"}>{x.cost.unitCost ? formatEUR(x.cost.unitCost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 2. Margini simulati */}
        <Section
          title={t.margins} hint={t.marginsHint} csvLabel={m.common.exportCsv}
          onCsv={() =>
            csvFile("margini", [t.colRecipe, m.recipes.suggested, `${t.planned} %`, m.recipes.currentPrice, `${t.current} %`], summaries.map((x) => [
              x.recipe.name, x.pricing.ok ? csvNumber(x.pricing.suggested.gross) : "", x.pricing.ok ? csvNumber(x.pricing.suggested.marginPercent, 1) : "",
              x.recipe.currentPriceCents != null ? csvNumber(x.recipe.currentPriceCents / 100) : "", csvNumber(x.currentMarginPercent, 1),
            ]))
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={AXIS.grid} />
                <XAxis dataKey="name" tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS.grid }} interval={0} tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)} />
                <YAxis tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: number) => formatPercent(v)} cursor={{ fill: "rgba(132,42,66,0.06)" }} contentStyle={{ borderRadius: 12, borderColor: AXIS.grid, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar isAnimationActive={false} dataKey="planned" name={t.planned} fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar isAnimationActive={false} dataKey="current" name={t.current} fill={SERIES.secondary} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr>
                <th scope="col" className={th}>{t.colRecipe}</th>
                <th scope="col" className={th + " text-right"}>{m.recipes.suggested}</th>
                <th scope="col" className={th + " text-right"}>{t.planned}</th>
                <th scope="col" className={th + " text-right"}>{m.recipes.currentPrice}</th>
                <th scope="col" className={th + " text-right"}>{t.current}</th>
              </tr></thead>
              <tbody>
                {summaries.map((x) => {
                  const cur = x.currentMarginPercent?.toNumber() ?? null;
                  return (
                    <tr key={x.recipe.id}>
                      <th scope="row" className={td + " text-left font-medium"}>{x.recipe.name}</th>
                      <td className={td + " text-right"}>{x.pricing.ok ? formatEUR(x.pricing.suggested.gross) : "—"}</td>
                      <td className={td + " text-right"}>{x.pricing.ok ? formatPercent(x.pricing.suggested.marginPercent) : "—"}</td>
                      <td className={td + " text-right"}>{x.recipe.currentPriceCents != null ? formatEUR(x.recipe.currentPriceCents / 100) : "—"}</td>
                      <td className={td + " text-right"}><MarginPill value={cur} target={x.targetMarginPercent} label={formatPercent(cur)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
          {/* 3. Ingredienti che pesano di più */}
          <Section
            title={t.topIngredients} hint={t.topIngredientsHint} csvLabel={m.common.exportCsv}
            onCsv={() => csvFile("ingredienti-costi", [m.ingredients.colName, t.colCost, `${t.share} %`, t.colRecipes], ingredientContributions(summaries).map((c) => [c.name, csvNumber(c.total), csvNumber(c.sharePercent, 1), c.recipeCount]))}
          >
            {contributions.length === 0 ? <p className="text-sm text-ink-muted">—</p> : (
              <>
                <div style={{ height: Math.max(180, contributions.length * 30) }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributions.map((c) => ({ name: c.name, value: c.total.toNumber() }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke={AXIS.grid} />
                      <XAxis type="number" tick={{ fill: AXIS.tick, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatEUR(v)} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)} />
                      <Tooltip formatter={(v: number) => [formatEUR(v), t.colCost]} cursor={{ fill: "rgba(132,42,66,0.06)" }} contentStyle={{ borderRadius: 12, borderColor: AXIS.grid, fontSize: 12 }} />
                      <Bar isAnimationActive={false} dataKey="value" fill={SERIES.primary} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="mt-3 w-full text-sm">
                  <thead><tr>
                    <th scope="col" className={th}>{m.ingredients.colName}</th>
                    <th scope="col" className={th + " text-right"}>{t.colCost}</th>
                    <th scope="col" className={th + " text-right"}>{t.share}</th>
                    <th scope="col" className={th + " text-right"}>{t.colRecipes}</th>
                  </tr></thead>
                  <tbody>
                    {contributions.map((c) => (
                      <tr key={c.ingredientId}>
                        <th scope="row" className={td + " text-left font-medium"}>{c.name}</th>
                        <td className={td + " text-right"}>{formatEUR(c.total)}</td>
                        <td className={td + " text-right"}>{formatPercent(c.sharePercent)}</td>
                        <td className={td + " text-right"}>{c.recipeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          {/* 4. Prezzi a confronto */}
          <Section
            title={t.priceComparison} hint={t.priceComparisonHint} csvLabel={m.common.exportCsv}
            onCsv={() =>
              csvFile(`prezzi-${sel.recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [`${t.priceAtMargin} %`, t.colPrice2, t.colContribution, `${t.colMarkup} %`], [
                ...ladder.map(({ margin, r }) => r.ok ? [String(margin), csvNumber(r.suggested.gross), csvNumber(r.suggested.contribution), csvNumber(r.suggested.markupPercent, 1)] : [String(margin), "", "", ""]),
                ...(currentEval ? [[t.currentRow, csvNumber(currentEval.gross), csvNumber(currentEval.contribution), csvNumber(currentEval.markupPercent, 1)]] : []),
              ])
            }
          >
            <label htmlFor="rep-recipe" className="sr-only">{t.colRecipe}</label>
            <Select id="rep-recipe" value={sel.recipe.id} onChange={(e) => setRecipeId(e.target.value)} className="mb-3 print:hidden">
              {summaries.map((x) => <option key={x.recipe.id} value={x.recipe.id}>{x.recipe.name}</option>)}
            </Select>
            <p className="mb-2 hidden font-medium print:block">{sel.recipe.name}</p>
            <p className="mb-3 text-xs text-ink-muted">
              {m.calculator.unitCost}: <strong className="text-ink">{sel.pricing.ok ? formatEUR(sel.pricing.fullUnitCost) : "—"}</strong>
              {" · "}{t.feesShort} {formatPercent(s.defaultFeePercent)} · {t.vatShort} {formatPercent(s.vatPercent)}
            </p>
            <table className="w-full text-sm">
              <thead><tr>
                <th scope="col" className={th}>{t.priceAtMargin}</th>
                <th scope="col" className={th + " text-right"}>{t.colPrice2}</th>
                <th scope="col" className={th + " text-right"}>{t.colContribution}</th>
                <th scope="col" className={th + " text-right"}>{t.colMarkup}</th>
              </tr></thead>
              <tbody>
                {ladder.map(({ margin, r }) => (
                  <tr key={margin} className={margin === Math.round(sel.targetMarginPercent) ? "bg-rose-soft" : undefined}>
                    <th scope="row" className={td + " text-left font-medium"}>{formatPercent(margin, 0)}</th>
                    <td className={td + " text-right font-medium"}>{r.ok ? formatEUR(r.suggested.gross) : "—"}</td>
                    <td className={td + " text-right"}>{r.ok ? formatEUR(r.suggested.contribution) : m.pricingErrors[r.error]}</td>
                    <td className={td + " text-right"}>{r.ok ? formatPercent(r.suggested.markupPercent) : "—"}</td>
                  </tr>
                ))}
                {currentEval && (
                  <tr className="bg-cream">
                    <th scope="row" className={td + " text-left font-medium"}>{t.currentRow} <span className="text-xs font-normal text-ink-muted">({formatPercent(currentEval.marginPercent)})</span></th>
                    <td className={td + " text-right font-medium"}>{formatEUR(currentEval.gross)}</td>
                    <td className={td + " text-right"}>{formatEUR(currentEval.contribution)}</td>
                    <td className={td + " text-right"}>{formatPercent(currentEval.markupPercent)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        </div>

        {/* 5. Andamento prezzi */}
        <Section
          title={t.priceHistory} hint={t.priceHistoryHint} csvLabel={m.common.exportCsv}
          onCsv={withHistory.length ? () =>
            csvFile("storico-prezzi", [m.ingredients.colName, t.colDate, t.colPrice, t.colPackage, t.colUnitCost, m.editor.unit],
              withHistory.flatMap((i) => {
                const base = baseUnitOf(i.purchaseUnit);
                const sc = base === "pz" ? 1 : 1000;
                const per = base === "g" ? "€/kg" : base === "ml" ? "€/l" : "€/pz";
                return [...i.priceHistory, { date: i.updatedAt, pricePaidCents: i.pricePaidCents, purchaseQuantity: i.purchaseQuantity, purchaseUnit: i.purchaseUnit }]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p) => {
                    const c = costPerBaseUnit(p);
                    return [i.name, p.date.slice(0, 10), csvNumber(p.pricePaidCents / 100), `${csvNumber(p.purchaseQuantity, 3)} ${p.purchaseUnit}`, c.ok ? csvNumber(c.costPerBase.mul(sc), 4) : "", per];
                  });
              })) : undefined
          }
        >
          {!ing ? (
            <p className="rounded-xl bg-cream px-4 py-6 text-center text-sm text-ink-muted">{t.noHistory}</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px] [&>*]:min-w-0">
              <div>
                <label htmlFor="rep-ing" className="sr-only">{t.pickIngredient}</label>
                <Select id="rep-ing" value={ing.id} onChange={(e) => setIngId(e.target.value)} className="mb-3 max-w-sm print:hidden">
                  {withHistory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={histRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={AXIS.grid} />
                      <XAxis dataKey="date" tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS.grid }} />
                      <YAxis tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={false} width={72} domain={["auto", "auto"]} tickFormatter={(v: number) => formatEUR(v)} />
                      <Tooltip formatter={(v: number) => [`${formatEUR(v)}/${scaleUnit}`, ing.name]} contentStyle={{ borderRadius: 12, borderColor: AXIS.grid, fontSize: 12 }} />
                      <Line isAnimationActive={false} type="monotone" dataKey="value" stroke={SERIES.primary} strokeWidth={2} dot={{ r: 4, fill: SERIES.primary, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                {variation && (
                  <div className="mb-3 rounded-xl bg-cream p-3">
                    <p className="text-xs text-ink-muted">{t.variation}</p>
                    <p className={`font-serif text-2xl font-semibold tabular-nums ${variation.gt(0) ? "text-danger" : "text-sage-dark"}`}>
                      {variation.gt(0) ? "+" : ""}{formatPercent(variation)}
                    </p>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead><tr>
                    <th scope="col" className={th}>{t.colDate}</th>
                    <th scope="col" className={th + " text-right"}>{t.colUnitCost}</th>
                  </tr></thead>
                  <tbody>
                    {histRows.map((h, i) => (
                      <tr key={i}>
                        <td className={td}>{h.date}</td>
                        <td className={td + " text-right"}>{formatUnitCost(h.raw.costPerBase, unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
