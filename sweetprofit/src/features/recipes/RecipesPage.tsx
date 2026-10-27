"use client";

import { AlertTriangle, Calculator, ChefHat, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, MarginPill, PageHeader } from "@/components/ui/misc";
import { DemoBanner } from "@/features/dashboard/DemoBanner";
import { summarizeAll, type RecipeSummary } from "@/lib/calc/analytics";
import { deleteRecipe, duplicateRecipe } from "@/lib/domain/actions";
import type { Recipe } from "@/lib/domain/types";
import { formatEUR, formatNumber, formatPercent } from "@/lib/i18n/format";
import { useStore } from "@/lib/store/AppStore";

type Sort = "name" | "unitCost" | "margin";

export function RecipesPage() {
  const { data, update, m } = useStore();
  const t = m.recipes;
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [toDelete, setToDelete] = useState<Recipe | null>(null);

  const summaries = useMemo(() => summarizeAll(data), [data]);
  const categories = useMemo(
    () => [...new Set(data.recipes.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it")),
    [data.recipes],
  );
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const num = (d: { toNumber(): number } | null | undefined) => (d ? d.toNumber() : -Infinity);
    return summaries
      .filter((s) => (!cat || s.recipe.category === cat) && (!q || s.recipe.name.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === "name"
          ? a.recipe.name.localeCompare(b.recipe.name, "it")
          : sort === "unitCost"
            ? num(b.cost.unitCost) - num(a.cost.unitCost)
            : num(b.referenceMarginPercent) - num(a.referenceMarginPercent),
      );
  }, [summaries, query, cat, sort]);

  const newButton = data.ingredients.length ? (
    <Button asChild><Link href="/ricette/modifica/"><Plus /> {t.add}</Link></Button>
  ) : (
    <Button asChild variant="outline"><Link href="/ingredienti/"><Plus /> {m.dashboard.newIngredient}</Link></Button>
  );

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} icon={ChefHat} actions={newButton} />
      <DemoBanner />

      {data.recipes.length === 0 ? (
        <EmptyState icon={ChefHat} title={t.emptyTitle} body={data.ingredients.length ? t.emptyBody : t.needIngredients} action={newButton} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="pl-9" aria-label={m.common.search} />
            </div>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-48" aria-label={m.common.category}>
              <option value="">{m.common.all}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="sm:w-48" aria-label={t.sortBy}>
              <option value="name">{t.sortBy}: {t.sortName}</option>
              <option value="unitCost">{t.sortBy}: {t.sortUnitCost}</option>
              <option value="margin">{t.sortBy}: {t.sortMargin}</option>
            </Select>
          </div>
          <p className="mb-3 text-sm text-ink-muted" aria-live="polite">{t.count(list.length)}</p>

          {list.length === 0 ? (
            <EmptyState icon={Search} title={m.common.noResults} action={<Button variant="outline" onClick={() => { setQuery(""); setCat(""); }}>{m.common.clearFilters}</Button>} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((s) => (
                <RecipeCard
                  key={s.recipe.id}
                  s={s}
                  onDuplicate={() => { update((d) => duplicateRecipe(d, s.recipe.id, m.common.copySuffix)); toast.success(t.duplicated); }}
                  onDelete={() => setToDelete(s.recipe)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={toDelete ? t.deleteTitle(toDelete.name) : ""}
        body={t.deleteBody}
        confirmLabel={m.common.delete}
        onConfirm={() => {
          const id = toDelete!.id;
          update((d) => deleteRecipe(d, id));
          toast.success(t.deleted);
        }}
      />
    </>
  );
}

function RecipeCard({ s, onDuplicate, onDelete }: { s: RecipeSummary; onDuplicate: () => void; onDelete: () => void }) {
  const { m } = useStore();
  const t = m.recipes;
  const r = s.recipe;
  const margin = s.referenceMarginPercent?.toNumber() ?? null;
  return (
    <li className="group flex flex-col rounded-2xl border border-line/70 bg-white shadow-card transition-shadow hover:shadow-lift">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/ricette/modifica/?id=${encodeURIComponent(r.id)}`} className="font-serif text-lg font-semibold leading-snug text-ink hover:text-wine">
              {r.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span>{r.category || m.common.noCategory}</span>
              <span aria-hidden>·</span>
              <span>{t.yield} {formatNumber(r.yieldQuantity, 2)} {r.yieldUnit}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {r.isDemo && <Badge variant="demo" title={m.common.demoTitle}>{m.common.demo}</Badge>}
            {!s.cost.complete && <Badge variant="warn"><AlertTriangle aria-hidden />{m.common.incomplete}</Badge>}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-ink-muted">{t.totalCost}</dt>
            <dd className="font-medium tabular-nums">{formatEUR(s.cost.totalCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.unitCost}</dt>
            <dd className="font-semibold tabular-nums text-wine">{s.cost.unitCost ? formatEUR(s.cost.unitCost) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.suggested}</dt>
            <dd className="font-medium tabular-nums">{s.pricing.ok ? formatEUR(s.pricing.suggested.gross) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">
              {t.margin} {s.referenceSource === "current" ? m.dashboard.marginAtCurrent : m.dashboard.marginPlanned}
            </dt>
            <dd><MarginPill value={margin} target={s.targetMarginPercent} label={formatPercent(margin)} /></dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-1 border-t border-line/60 px-3 py-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/calcolatore/?ricetta=${encodeURIComponent(r.id)}`}><Calculator /> {t.priceIt}</Link>
        </Button>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon" title={m.common.edit}>
            <Link href={`/ricette/modifica/?id=${encodeURIComponent(r.id)}`} aria-label={`${m.common.edit} ${r.name}`}><Pencil /></Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onDuplicate} title={m.common.duplicate} aria-label={`${m.common.duplicate} ${r.name}`}><Copy /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title={m.common.delete} aria-label={`${m.common.delete} ${r.name}`} className="hover:text-danger"><Trash2 /></Button>
        </div>
      </div>
    </li>
  );
}
