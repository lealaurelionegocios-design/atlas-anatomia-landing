"use client";

import { Copy, Pencil, Plus, Search, Trash2, Wheat } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { DemoBanner } from "@/features/dashboard/DemoBanner";
import { costPerBaseUnit } from "@/lib/calc/ingredient";
import { deleteIngredient, duplicateIngredient, upsertIngredient } from "@/lib/domain/actions";
import type { Ingredient, Recipe } from "@/lib/domain/types";
import { formatDate, formatEUR, formatQty, formatUnitCost } from "@/lib/i18n/format";
import { useStore } from "@/lib/store/AppStore";
import { IngredientForm } from "./IngredientForm";

export function IngredientsPage() {
  const { data, update, m } = useStore();
  const t = m.ingredients;
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<Ingredient | null>(null);
  const [blocked, setBlocked] = useState<{ ing: Ingredient; recipes: Recipe[] } | null>(null);

  const categories = useMemo(
    () => [...new Set(data.ingredients.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it")),
    [data.ingredients],
  );
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data.recipes) for (const id of new Set(r.items.map((i) => i.ingredientId))) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [data.recipes]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.ingredients
      .filter((i) => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [data.ingredients, query, cat]);

  const openForm = (ing: Ingredient | null) => {
    setEditing(ing);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (ing: Ingredient) => {
    const r = deleteIngredient(data, ing.id);
    if (r.ok) setToDelete(ing);
    else setBlocked({ ing, recipes: r.usedBy });
  };

  const actions = (ing: Ingredient) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => openForm(ing)} aria-label={`${m.common.edit} ${ing.name}`} title={m.common.edit}><Pencil /></Button>
      <Button
        variant="ghost" size="icon" title={m.common.duplicate} aria-label={`${m.common.duplicate} ${ing.name}`}
        onClick={() => { update((d) => duplicateIngredient(d, ing.id, m.common.copySuffix)); toast.success(t.duplicated); }}
      ><Copy /></Button>
      <Button variant="ghost" size="icon" onClick={() => askDelete(ing)} aria-label={`${m.common.delete} ${ing.name}`} title={m.common.delete} className="hover:text-danger"><Trash2 /></Button>
    </div>
  );

  const unitCost = (ing: Ingredient) => {
    const c = costPerBaseUnit(ing);
    return c.ok ? formatUnitCost(c.costPerBase, c.baseUnit) : "—";
  };

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        icon={Wheat}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.add}</Button>}
      />
      <DemoBanner />

      {data.ingredients.length === 0 ? (
        <EmptyState icon={Wheat} title={t.emptyTitle} body={t.emptyBody} action={<Button onClick={() => openForm(null)}><Plus /> {t.add}</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="pl-9" aria-label={m.common.search} />
            </div>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-56" aria-label={t.filterCategory}>
              <option value="">{m.common.all}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <span className="text-sm text-ink-muted sm:ml-2" aria-live="polite">{t.count(list.length)}</span>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={Search} title={m.common.noResults} action={<Button variant="outline" onClick={() => { setQuery(""); setCat(""); }}>{m.common.clearFilters}</Button>} />
          ) : (
            <>
              {/* Tabella desktop */}
              <TableWrap className="hidden md:block">
                <Table>
                  <thead>
                    <tr>
                      <Th>{t.colName}</Th>
                      <Th>{t.colPackage}</Th>
                      <Th className="text-right">{t.colPrice}</Th>
                      <Th className="text-right">{t.colUnitCost}</Th>
                      <Th>{t.colSupplier}</Th>
                      <Th>{t.colUsedIn}</Th>
                      <Th>{m.common.updated}</Th>
                      <Th className="text-right"><span className="sr-only">{m.common.actions}</span></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((ing) => (
                      <Tr key={ing.id}>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className="text-left font-medium hover:text-wine" onClick={() => openForm(ing)}>{ing.name}</button>
                            {ing.isDemo && <Badge variant="demo" title={m.common.demoTitle}>{m.common.demo}</Badge>}
                          </div>
                          {ing.category && <div className="text-xs text-ink-muted">{ing.category}</div>}
                        </Td>
                        <Td className="tabular-nums text-ink-muted">{formatQty(ing.purchaseQuantity, ing.purchaseUnit)}</Td>
                        <Td className="text-right tabular-nums">{formatEUR(ing.pricePaidCents / 100)}</Td>
                        <Td className="text-right font-medium tabular-nums text-wine">{unitCost(ing)}</Td>
                        <Td className="text-ink-muted">{ing.supplier || "—"}</Td>
                        <Td className="text-ink-muted">{t.usedIn(usage.get(ing.id) ?? 0)}</Td>
                        <Td className="whitespace-nowrap text-ink-muted">{formatDate(ing.updatedAt)}</Td>
                        <Td>{actions(ing)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>

              {/* Schede mobile */}
              <ul className="space-y-3 md:hidden">
                {list.map((ing) => (
                  <li key={ing.id} className="rounded-2xl border border-line/70 bg-white p-4 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          {ing.isDemo && <Badge variant="demo">{m.common.demo}</Badge>}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {[ing.category, ing.supplier].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-wine">{unitCost(ing)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-ink-muted">
                      <span className="tabular-nums">{formatQty(ing.purchaseQuantity, ing.purchaseUnit)} · {formatEUR(ing.pricePaidCents / 100)}</span>
                      <span>{t.usedIn(usage.get(ing.id) ?? 0)}</span>
                    </div>
                    <div className="mt-2 border-t border-line/60 pt-2">{actions(ing)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <IngredientForm
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        categories={categories}
        existingNames={data.ingredients.filter((i) => i.id !== editing?.id).map((i) => i.name)}
        onSave={(draft) => {
          update((d) => upsertIngredient(d, draft));
          setFormOpen(false);
          toast.success(t.saved);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={toDelete ? t.deleteTitle(toDelete.name) : ""}
        body={t.deleteBody}
        confirmLabel={m.common.delete}
        onConfirm={() => {
          const id = toDelete!.id;
          update((d) => {
            const r = deleteIngredient(d, id);
            return r.ok ? r.data : d;
          });
          toast.success(t.deleted);
        }}
      />
      <ConfirmDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        title={t.deleteBlockedTitle}
        hideConfirm
        body={
          blocked && (
            <>
              <p>{t.deleteBlocked(blocked.recipes.length)}</p>
              <ul className="list-disc pl-5 text-ink">{blocked.recipes.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
            </>
          )
        }
      />
    </>
  );
}
