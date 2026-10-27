"use client";

import { AlertTriangle, ArrowLeft, Calculator, ChefHat, Clock, Package, Plus, Receipt, Save, Trash2, Wheat } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NumberInput, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Notice } from "@/components/ui/misc";
import { IngredientForm } from "@/features/ingredients/IngredientForm";
import { calcRecipeCost, indexIngredients } from "@/lib/calc/recipe";
import { baseUnitOf, compatibleUnits } from "@/lib/calc/units";
import { upsertIngredient, upsertRecipe } from "@/lib/domain/actions";
import type { Recipe, Unit } from "@/lib/domain/types";
import { formatEUR, formatNumber } from "@/lib/i18n/format";
import { issueText } from "@/lib/i18n/issues";
import { useStore } from "@/lib/store/AppStore";
import { newId } from "@/lib/utils/id";
import { cn } from "@/lib/utils/cn";
import { draftFromForm, formFromRecipe, newExtra, newLine, validateForm, type ExtraState, type LineState, type RecipeFormState } from "./recipeForm";

export function RecipeEditor() {
  const params = useSearchParams();
  const id = params.get("id");
  const { data, m } = useStore();
  const recipe = id ? data.recipes.find((r) => r.id === id) ?? null : null;
  if (id && !recipe)
    return (
      <EmptyState icon={ChefHat} title={m.editor.notFound} action={<Button asChild variant="outline"><Link href="/ricette/"><ArrowLeft /> {m.nav.recipes}</Link></Button>} />
    );
  return <EditorInner key={id ?? "new"} recipe={recipe} />;
}

function EditorInner({ recipe }: { recipe: Recipe | null }) {
  const { data, update, m } = useStore();
  const t = m.editor;
  const router = useRouter();
  const [form, setForm] = useState<RecipeFormState>(() => {
    const f = formFromRecipe(recipe, data.settings);
    return recipe ? f : { ...f, lines: [newLine()] };
  });
  const [initialJson] = useState(() => JSON.stringify(form));
  const [submitted, setSubmitted] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [newIngFor, setNewIngFor] = useState<string | null>(null);
  const [ingFormKey, setIngFormKey] = useState(0);
  const dirty = JSON.stringify(form) !== initialJson;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const idx = useMemo(() => indexIngredients(data.ingredients), [data.ingredients]);
  const sortedIngredients = useMemo(() => [...data.ingredients].sort((a, b) => a.name.localeCompare(b.name, "it")), [data.ingredients]);
  const draft = useMemo(() => draftFromForm(form), [form]);
  const cost = useMemo(
    () => calcRecipeCost({ ...draft, id: "draft", isDemo: false, createdAt: "", updatedAt: "" }, idx),
    [draft, idx],
  );
  const errors = useMemo(() => validateForm(form, m), [form, m]);
  const err = (k: string) => (submitted ? errors[k] ?? null : null);

  const set = <K extends keyof RecipeFormState>(k: K, v: RecipeFormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (lid: string, patch: Partial<LineState>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));
  const setExtra = (eid: string, patch: Partial<ExtraState>) =>
    setForm((f) => ({ ...f, extras: f.extras.map((x) => (x.id === eid ? { ...x, ...patch } : x)) }));

  const pickIngredient = (lid: string, ingredientId: string) => {
    const ing = idx.get(ingredientId);
    setLine(lid, { ingredientId, unit: ing ? baseUnitOf(ing.purchaseUnit) : "g" });
  };

  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      toast.error(m.validation.fixErrors);
      return;
    }
    const d = draftFromForm({ ...form, lines: form.lines.filter((l) => l.ingredientId || l.qty.trim()) });
    const rid = d.id ?? newId("rec");
    update((cur) => upsertRecipe(cur, { ...d, id: rid }).data);
    toast.success(t.saved);
    router.push("/ricette/");
  };

  const back = () => (dirty ? setLeaveOpen(true) : router.push("/ricette/"));
  const yieldUnit = form.yieldUnit || "unità";

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={back} aria-label={m.common.back}><ArrowLeft /></Button>
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight">{recipe ? t.titleEdit : t.titleNew}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-ink-muted">
              {recipe?.isDemo && <Badge variant="demo">{m.common.demo}</Badge>}
              {dirty && <span>{t.unsaved}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {recipe && (
            <Button asChild type="button" variant="outline">
              <Link href={`/calcolatore/?ricetta=${encodeURIComponent(recipe.id)}`}><Calculator /> {m.recipes.priceIt}</Link>
            </Button>
          )}
          <Button type="submit"><Save /> {t.save}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <div className="space-y-6">
          {/* Informazioni */}
          <Card>
            <CardHeader><CardTitle>{t.general}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="r-name" label={t.fName} error={err("name")} className="sm:col-span-2">
                <Input {...fieldAria("r-name", err("name"))} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t.fNamePh} maxLength={120} />
              </Field>
              <Field id="r-cat" label={t.fCategory} optional={m.common.optional}>
                <Input id="r-cat" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder={t.fCategoryPh} list="r-cat-list" maxLength={60} />
                <datalist id="r-cat-list">
                  {[...new Set(data.recipes.map((r) => r.category).filter(Boolean))].map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="r-yield" label={t.fYield} error={err("yieldQty")}>
                  <NumberInput {...fieldAria("r-yield", err("yieldQty"))} value={form.yieldQty} onChange={(e) => set("yieldQty", e.target.value)} />
                </Field>
                <Field id="r-yunit" label={t.fYieldUnit}>
                  <Input id="r-yunit" value={form.yieldUnit} onChange={(e) => set("yieldUnit", e.target.value)} placeholder={t.fYieldUnitPh} list="r-yunit-list" maxLength={30} />
                  <datalist id="r-yunit-list">{["porzioni", "fette", "pezzi", "torte", "vasetti", "kg"].map((u) => <option key={u} value={u} />)}</datalist>
                </Field>
                <p className="col-span-2 -mt-2 text-xs text-ink-muted">{t.fYieldHint}</p>
              </div>
            </CardContent>
          </Card>

          {/* Ingredienti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wheat className="size-4 text-wine" aria-hidden />{t.ingredientsSection}</CardTitle>
              <CardDescription>{t.ingredientsHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.lines.length === 0 && <p className="rounded-xl bg-cream px-4 py-3 text-sm text-ink-muted">{t.noLines}</p>}
              {form.lines.map((line, n) => {
                const ing = idx.get(line.ingredientId);
                const units: Unit[] = ing ? compatibleUnits(ing.purchaseUnit, ing.densityGPerMl) : ["g", "kg", "ml", "l", "pz"];
                const item = cost.items.find((i) => i.itemId === line.id);
                const lineErr = err(`line-${line.id}`);
                return (
                  <div key={line.id} className={cn("rounded-xl border border-line/70 p-3", lineErr && "border-danger/50 bg-danger-soft/40")}>
                    <div className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_110px_120px_100px_auto]">
                      <div className="col-span-2 sm:col-span-1">
                        <label htmlFor={`l-ing-${line.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{m.ingredients.colName} {n + 1}</label>
                        <Select id={`l-ing-${line.id}`} value={line.ingredientId} onChange={(e) => pickIngredient(line.id, e.target.value)} aria-invalid={!!lineErr && !line.ingredientId}>
                          <option value="">{t.pickIngredient}</option>
                          {sortedIngredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor={`l-q-${line.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{t.qty}</label>
                        <NumberInput id={`l-q-${line.id}`} value={line.qty} onChange={(e) => setLine(line.id, { qty: e.target.value })} placeholder="0" aria-invalid={!!lineErr} />
                      </div>
                      <div>
                        <label htmlFor={`l-u-${line.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{t.unit}</label>
                        <Select id={`l-u-${line.id}`} value={line.unit} onChange={(e) => setLine(line.id, { unit: e.target.value as Unit })}>
                          {units.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </div>
                      <div className="text-right">
                        <span className="mb-1 block text-xs font-medium text-ink-muted">{t.lineCost}</span>
                        <span className="flex h-10 items-center justify-end font-medium tabular-nums text-wine">
                          {item?.cost ? formatEUR(item.cost) : "—"}
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="mb-0.5 hover:text-danger" aria-label={`${t.removeLine} ${n + 1}`} onClick={() => set("lines", form.lines.filter((l) => l.id !== line.id))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {lineErr && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{lineErr}</p>}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => set("lines", [...form.lines, newLine()])}><Plus /> {t.addIngredient}</Button>
                <Button type="button" variant="link" onClick={() => { const l = newLine(); setForm((f) => ({ ...f, lines: [...f.lines, l] })); setNewIngFor(l.id); setIngFormKey((k) => k + 1); }}>
                  {t.newIngredientInline}
                </Button>
              </div>
              <div className="grid gap-4 border-t border-line/60 pt-4 sm:grid-cols-2">
                <Field id="r-waste" label={t.waste} error={err("waste")} hint={t.wasteHint}>
                  <NumberInput {...fieldAria("r-waste", err("waste"), true)} value={form.waste} onChange={(e) => set("waste", e.target.value)} suffix="%" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Manodopera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="size-4 text-wine" aria-hidden />{t.labor}</CardTitle>
              <CardDescription>{t.laborHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field id="r-lmin" label={t.laborMinutes} error={err("laborMinutes")}>
                <NumberInput {...fieldAria("r-lmin", err("laborMinutes"))} value={form.laborMinutes} onChange={(e) => set("laborMinutes", e.target.value)} suffix="min" />
              </Field>
              <Field id="r-lrate" label={t.laborRate} error={err("laborRate")}>
                <NumberInput {...fieldAria("r-lrate", err("laborRate"))} value={form.laborRate} onChange={(e) => set("laborRate", e.target.value)} suffix="€/h" />
              </Field>
              <div className="flex flex-col justify-end">
                <span className="text-xs font-medium text-ink-muted">{m.costParts.labor}</span>
                <span className="flex h-10 items-center font-medium tabular-nums text-wine">{formatEUR(cost.laborCost)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Confezionamento e altre spese */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="size-4 text-wine" aria-hidden />{t.extras}</CardTitle>
              <CardDescription>{t.extrasHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.extras.map((x) => {
                const e = err(`extra-${x.id}`);
                return (
                  <div key={x.id} className="rounded-xl border border-line/70 p-3">
                    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[170px_minmax(0,1fr)_110px_160px_auto]">
                      <div>
                        <label htmlFor={`x-k-${x.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{m.common.category}</label>
                        <Select id={`x-k-${x.id}`} value={x.kind} onChange={(ev) => setExtra(x.id, { kind: ev.target.value as ExtraState["kind"] })}>
                          <option value="packaging">{t.kindPackaging}</option>
                          <option value="other">{t.kindOther}</option>
                        </Select>
                      </div>
                      <div>
                        <label htmlFor={`x-l-${x.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{t.extraLabel}</label>
                        <Input id={`x-l-${x.id}`} value={x.label} onChange={(ev) => setExtra(x.id, { label: ev.target.value })} maxLength={120} />
                      </div>
                      <div>
                        <label htmlFor={`x-a-${x.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{t.extraAmount}</label>
                        <NumberInput id={`x-a-${x.id}`} value={x.amount} onChange={(ev) => setExtra(x.id, { amount: ev.target.value })} placeholder="0,00" aria-invalid={!!e} suffix="€" />
                      </div>
                      <div>
                        <label htmlFor={`x-b-${x.id}`} className="mb-1 block text-xs font-medium text-ink-muted">{t.extraBasis}</label>
                        <Select id={`x-b-${x.id}`} value={x.basis} onChange={(ev) => setExtra(x.id, { basis: ev.target.value as ExtraState["basis"] })}>
                          <option value="unit">{t.basisUnit}</option>
                          <option value="batch">{t.basisBatch}</option>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="mb-0.5 hover:text-danger" aria-label={`${m.common.delete} ${x.label}`} onClick={() => set("extras", form.extras.filter((y) => y.id !== x.id))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {e && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{e}</p>}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => set("extras", [...form.extras, newExtra("packaging")])}><Plus /> {t.addPackaging}</Button>
                <Button type="button" variant="outline" onClick={() => set("extras", [...form.extras, newExtra("other")])}><Plus /> {t.addOther}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Prezzo */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="size-4 text-wine" aria-hidden />{t.pricing}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field id="r-margin" label={t.targetMargin} error={err("targetMargin")} hint={t.targetMarginHint(data.settings.defaultMarginPercent)}>
                <NumberInput {...fieldAria("r-margin", err("targetMargin"), true)} value={form.targetMargin} onChange={(e) => set("targetMargin", e.target.value)} placeholder={String(data.settings.defaultMarginPercent)} suffix="%" />
              </Field>
              <Field id="r-price" label={t.currentPrice} error={err("currentPrice")} hint={t.currentPriceHint}>
                <NumberInput {...fieldAria("r-price", err("currentPrice"), true)} value={form.currentPrice} onChange={(e) => set("currentPrice", e.target.value)} placeholder="0,00" suffix="€" />
              </Field>
              <Field id="r-notes" label={t.notes} optional={m.common.optional} className="sm:col-span-2">
                <Textarea id="r-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={2000} />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Riepilogo */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-wine to-wine-dark px-5 py-5 text-white">
              <p className="text-sm text-rose-light">{m.recipes.unitCost} · {t.perUnitOf(yieldUnit)}</p>
              <p className="mt-1 font-serif text-4xl font-semibold tabular-nums" aria-live="polite">{cost.unitCost ? formatEUR(cost.unitCost) : "—"}</p>
              <p className="mt-1 text-sm text-rose-light">
                {m.recipes.totalCost}: <span className="font-medium text-white">{formatEUR(cost.totalCost)}</span>
                {cost.unitCost && <> · {formatNumber(cost.yieldQuantity, 2)} {yieldUnit}</>}
              </p>
            </div>
            <CardContent className="pt-4">
              <h2 className="mb-2 text-sm font-semibold">{t.summary}</h2>
              <dl className="space-y-2 text-sm">
                {([
                  [m.costParts.ingredients, cost.ingredientsCost],
                  [m.costParts.waste, cost.wasteCost],
                  [m.costParts.labor, cost.laborCost],
                  [m.costParts.packaging, cost.packagingCost],
                  [m.costParts.other, cost.otherCost],
                ] as const).map(([label, v]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="tabular-nums">{formatEUR(v)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t border-line pt-2 font-semibold">
                  <dt>{m.recipes.totalCost}</dt>
                  <dd className="tabular-nums">{formatEUR(cost.totalCost)}</dd>
                </div>
              </dl>
              {cost.issues.length > 0 && (
                <Notice tone="warn" icon={AlertTriangle} className="mt-4">
                  <p className="font-medium">{m.common.incomplete}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                    {[...new Set(cost.issues.map((i) => issueText(m, i)))].map((txt) => <li key={txt}>{txt}</li>)}
                  </ul>
                </Notice>
              )}
              <Button type="submit" className="mt-4 w-full"><Save /> {t.save}</Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t.discardTitle}
        body={t.discardBody}
        confirmLabel={t.discard}
        onConfirm={() => router.push("/ricette/")}
      />
      <IngredientForm
        key={ingFormKey}
        open={newIngFor != null}
        onOpenChange={(o) => !o && setNewIngFor(null)}
        initial={null}
        categories={[...new Set(data.ingredients.map((i) => i.category).filter(Boolean))]}
        existingNames={data.ingredients.map((i) => i.name)}
        onSave={(draft) => {
          const iid = newId("ing");
          const unit = draft.purchaseUnit;
          update((d) => upsertIngredient(d, { ...draft, id: iid }));
          if (newIngFor) setLine(newIngFor, { ingredientId: iid, unit: baseUnitOf(unit) });
          setNewIngFor(null);
          toast.success(m.ingredients.saved);
        }}
      />
    </form>
  );
}
