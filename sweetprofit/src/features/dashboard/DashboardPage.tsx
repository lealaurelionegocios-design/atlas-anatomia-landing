"use client";

import {
  AlertTriangle, ArrowRight, BookOpen, Calculator, ChefHat, CloudDownload, Coins, Percent, Plus, Tag, TrendingDown, TrendingUp, Wheat,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CostStackChart } from "@/components/charts/CostStackChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, MarginPill, Notice, StatCard } from "@/components/ui/misc";
import { dashboardStats, summarizeAll, type RecipeSummary } from "@/lib/calc/analytics";
import { formatDate, formatEUR, formatPercent } from "@/lib/i18n/format";
import { useStore } from "@/lib/store/AppStore";
import { DemoBanner } from "./DemoBanner";

export function DashboardPage() {
  const { data, m } = useStore();
  const t = m.dashboard;
  const summaries = useMemo(() => summarizeAll(data), [data]);
  const st = useMemo(() => dashboardStats(data, summaries), [data, summaries]);

  const quick = [
    { href: "/ingredienti/", label: t.newIngredient, icon: Wheat },
    { href: "/ricette/modifica/", label: t.newRecipe, icon: ChefHat },
    { href: "/calcolatore/", label: t.openCalculator, icon: Calculator },
    { href: "/guida/", label: m.nav.guide, icon: BookOpen },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-wine">{t.title}</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.greeting(data.settings.businessName)}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/ingredienti/"><Plus /> {t.newIngredient}</Link></Button>
          {data.ingredients.length > 0 && <Button asChild><Link href="/ricette/modifica/"><Plus /> {t.newRecipe}</Link></Button>}
        </div>
      </div>

      <DemoBanner />

      {data.recipes.length === 0 && data.ingredients.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title={t.emptyTitle}
          body={t.emptyBody}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild><Link href="/ingredienti/"><Plus /> {t.newIngredient}</Link></Button>
              <Button asChild variant="outline"><Link href="/guida/"><BookOpen /> {m.nav.guide}</Link></Button>
            </div>
          }
        />
      ) : (
        <>
          <section aria-label={t.title} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.recipes} value={st.recipeCount} hint={t.ingredientsCount(st.ingredientCount)} icon={ChefHat} tone="wine" />
            <StatCard
              label={t.avgCost}
              value={st.avgBatchCost ? formatEUR(st.avgBatchCost) : "—"}
              hint={st.avgUnitCost ? t.avgCostHint(formatEUR(st.avgUnitCost)) : undefined}
              icon={Coins}
              tone="rose"
            />
            <StatCard label={t.avgPrice} value={st.avgSuggestedPrice ? formatEUR(st.avgSuggestedPrice) : "—"} hint={t.avgPriceHint} icon={Tag} tone="beige" />
            <StatCard label={t.plannedMargin} value={formatPercent(st.avgPlannedMargin)} hint={t.plannedMarginHint} icon={Percent} tone="sage" />
          </section>

          {st.incompleteCount > 0 && (
            <Notice tone="warn" icon={AlertTriangle} className="mt-4">
              {t.incompleteWarn(st.incompleteCount)} <Link href="/ricette/" className="font-medium underline">{m.nav.recipes}</Link>
            </Notice>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>{t.costChart}</CardTitle>
                <CardDescription>{t.costChartHint}</CardDescription>
              </CardHeader>
              <CardContent>
                {summaries.length ? <CostStackChart summaries={summaries} /> : <p className="py-10 text-center text-sm text-ink-muted">{m.reports.noData}</p>}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <MarginCard title={t.best} s={st.best} icon={TrendingUp} />
              <MarginCard title={t.worst} s={st.worst} icon={TrendingDown} />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t.quickActions}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-2">
                    {quick.map(({ href, label, icon: Icon }) => (
                      <li key={href}>
                        <Link href={href} className="flex h-full flex-col gap-2 rounded-xl border border-line/70 bg-cream/60 p-3 text-sm font-medium text-ink transition-colors hover:border-wine/30 hover:bg-rose-soft">
                          <Icon className="size-4 text-wine" aria-hidden />
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line/70 bg-white p-4 text-sm shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-ink-muted">
              <CloudDownload className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden />
              <span>
                {t.backupReminder}{" "}
                {data.settings.lastBackupAt ? t.backupLast(formatDate(data.settings.lastBackupAt)) : t.backupNever}
              </span>
            </p>
            <Button asChild variant="outline" size="sm"><Link href="/impostazioni/#backup">{t.doBackup} <ArrowRight /></Link></Button>
          </div>
          <p className="mt-4 text-xs text-ink-subtle">{t.disclaimer}</p>
        </>
      )}
    </>
  );
}

function MarginCard({ title, s, icon: Icon }: { title: string; s: RecipeSummary | null; icon: typeof TrendingUp }) {
  const { m } = useStore();
  if (!s) return null;
  const v = s.referenceMarginPercent?.toNumber() ?? null;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-light text-wine"><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">{title}</p>
          <Link href={`/calcolatore/?ricetta=${encodeURIComponent(s.recipe.id)}`} className="block truncate font-medium hover:text-wine">{s.recipe.name}</Link>
          <p className="text-xs text-ink-subtle">{s.referenceSource === "current" ? m.dashboard.marginAtCurrent : m.dashboard.marginPlanned}</p>
        </div>
        <MarginPill value={v} target={s.targetMarginPercent} label={formatPercent(v)} />
      </CardContent>
    </Card>
  );
}
