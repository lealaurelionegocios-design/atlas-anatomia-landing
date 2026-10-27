"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Notice, PageHeader } from "@/components/ui/misc";
import { dec } from "@/lib/calc/decimal";
import { costPerBaseUnit } from "@/lib/calc/ingredient";
import { calcPricing } from "@/lib/calc/pricing";
import { formatEUR, formatPercent, formatUnitCost } from "@/lib/i18n/format";
import { useMessages } from "@/lib/store/AppStore";
import { cn } from "@/lib/utils/cn";
import { parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";

const KEY = "sweetprofit.guide.step";

export function GuidePage() {
  const m = useMessages();
  const t = m.guide;
  const steps = t.steps;
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      if (Number.isInteger(v) && v >= 0 && v < steps.length) setI(v);
    } catch {
      /* storage non disponibile: si parte dal primo passo */
    }
  }, [steps.length]);
  const go = (n: number) => {
    setI(n);
    setDone(false);
    try { localStorage.setItem(KEY, String(n)); } catch { /* ignora */ }
  };
  const step = steps[i];

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} icon={BookOpen} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
        <nav aria-label={t.title}>
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {steps.map((s, n) => (
              <li key={n} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(n)}
                  aria-current={n === i ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine/40",
                    n === i ? "bg-white font-medium text-wine shadow-card" : "text-ink-muted hover:bg-white/70",
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", n < i || done ? "bg-sage text-sage-dark" : n === i ? "bg-wine text-white" : "bg-beige text-ink-muted")}>
                    {n < i || (done && n === i) ? <Check className="size-3.5" aria-hidden /> : n + 1}
                  </span>
                  <span className="whitespace-nowrap lg:whitespace-normal">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <Card className="animate-fade-in" key={i}>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-wine">{t.stepOf(i + 1, steps.length)}</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold">{step.title}</h2>
            <ol className="mt-4 space-y-3">
              {step.body.map((p, n) => (
                <li key={n} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-light text-[11px] font-semibold text-wine">{n + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
            <Notice icon={Lightbulb} className="mt-5">{step.tip}</Notice>

            <div className="mt-6 rounded-2xl border border-line/70 bg-cream/60 p-4">
              <p className="mb-3 text-sm font-semibold">{t.tryIt}</p>
              {i === 0 && <TryIngredient />}
              {(i === 1 || i === 2) && <TryLine />}
              {(i === 3 || i === 4) && <TryMargin />}
            </div>

            {done && i === steps.length - 1 && (
              <Notice tone="good" icon={Check} className="mt-5">
                <p className="font-medium">{t.done}</p>
                <p>{t.doneBody}</p>
              </Notice>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
              <Button asChild variant="outline"><Link href={step.href}>{t.goTo}: {step.title}</Link></Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => go(i - 1)} disabled={i === 0}><ArrowLeft /> {m.common.back}</Button>
                {i < steps.length - 1 ? (
                  <Button onClick={() => go(i + 1)}>{m.common.next} <ArrowRight /></Button>
                ) : done ? (
                  <Button variant="secondary" onClick={() => go(0)}><RotateCcw /> {t.restart}</Button>
                ) : (
                  <Button onClick={() => setDone(true)}><Check /> {m.common.confirm}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Mini-esercizi: usano lo stesso motore di calcolo dell'applicazione. */
function TryIngredient() {
  const m = useMessages();
  const [qty, setQty] = useState("1000");
  const [price, setPrice] = useState("1,80");
  const q = parseLocaleNumber(qty);
  const c = parseEuroToCents(price);
  const r = q != null && c != null ? costPerBaseUnit({ purchaseQuantity: q, purchaseUnit: "g", pricePaidCents: c }) : null;
  return (
    <div className="grid items-end gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-sm"><span className="text-ink-muted">{m.guide.demoPackage} (g)</span><NumberInput value={qty} onChange={(e) => setQty(e.target.value)} suffix="g" /></label>
      <label className="space-y-1 text-sm"><span className="text-ink-muted">{m.guide.demoPrice2}</span><NumberInput value={price} onChange={(e) => setPrice(e.target.value)} suffix="€" /></label>
      <div className="text-sm" aria-live="polite">
        <span className="block text-ink-muted">{m.guide.demoUnitCost}</span>
        <span className="font-serif text-xl font-semibold text-wine">{r?.ok ? formatUnitCost(r.costPerBase, "g") : "—"}</span>
      </div>
    </div>
  );
}

function TryLine() {
  const m = useMessages();
  const [used, setUsed] = useState("250");
  const u = parseLocaleNumber(used);
  const per = dec("0.0018");
  return (
    <div className="grid items-end gap-3 sm:grid-cols-3">
      <div className="text-sm"><span className="block text-ink-muted">Farina 00</span><span className="font-medium">{formatUnitCost(per, "g")}</span></div>
      <label className="space-y-1 text-sm"><span className="text-ink-muted">{m.guide.demoUsed}</span><NumberInput value={used} onChange={(e) => setUsed(e.target.value)} suffix="g" /></label>
      <div className="text-sm" aria-live="polite">
        <span className="block text-ink-muted">{m.guide.demoLine}</span>
        <span className="font-serif text-xl font-semibold text-wine">{u != null && u >= 0 ? formatEUR(per.mul(u)) : "—"}</span>
      </div>
    </div>
  );
}

function TryMargin() {
  const m = useMessages();
  const [cost, setCost] = useState("5");
  const [margin, setMargin] = useState(50);
  const c = parseLocaleNumber(cost);
  const r = c != null && c >= 0
    ? calcPricing({ unitCost: dec(c), yieldQuantity: 1, fixedCostPerBatch: dec(0), marginPercent: margin, feePercent: 0, vatPercent: 0, roundingStepCents: 1, roundingMode: "nearest" })
    : null;
  return (
    <div className="grid items-end gap-4 sm:grid-cols-[1fr_1.4fr_1fr]">
      <label className="space-y-1 text-sm"><span className="text-ink-muted">{m.guide.demoCost}</span><NumberInput value={cost} onChange={(e) => setCost(e.target.value)} suffix="€" /></label>
      <label className="space-y-1 text-sm">
        <span className="text-ink-muted">{m.guide.demoMargin}: <strong className="text-ink">{margin}%</strong></span>
        <input type="range" min={0} max={90} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="h-10 w-full accent-wine" />
      </label>
      <div className="text-sm" aria-live="polite">
        <span className="block text-ink-muted">{m.guide.demoPrice} · {m.guide.demoMarkup}</span>
        <span className="font-serif text-xl font-semibold text-wine">{r?.ok ? formatEUR(r.suggested.gross) : "—"}</span>
        <span className="ml-2 text-ink-muted">{r?.ok ? formatPercent(r.suggested.markupPercent) : ""}</span>
      </div>
    </div>
  );
}
