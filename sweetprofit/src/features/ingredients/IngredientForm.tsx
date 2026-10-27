"use client";

import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NumberInput, Select, Textarea } from "@/components/ui/input";
import { costPerBaseUnit, priceSeries } from "@/lib/calc/ingredient";
import type { IngredientDraft } from "@/lib/domain/actions";
import { UNITS, type Ingredient, type Unit } from "@/lib/domain/types";
import { formatDate, formatEUR, formatQty, formatUnitCost } from "@/lib/i18n/format";
import { useMessages } from "@/lib/store/AppStore";
import { centsToInput, numberToInput, parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";
import { baseUnitOf, toBase } from "@/lib/calc/units";

const today = () => new Date().toISOString().slice(0, 10);

export function IngredientForm({
  open, onOpenChange, initial, existingNames, categories, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Ingredient | null;
  existingNames: string[];
  categories: string[];
  onSave: (draft: IngredientDraft) => void;
}) {
  const m = useMessages();
  const t = m.ingredients;
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [qty, setQty] = useState(numberToInput(initial?.purchaseQuantity ?? 1));
  const [unit, setUnit] = useState<Unit>(initial?.purchaseUnit ?? "kg");
  const [price, setPrice] = useState(centsToInput(initial?.pricePaidCents ?? null));
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [density, setDensity] = useState(numberToInput(initial?.densityGPerMl ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [date, setDate] = useState(initial ? initial.updatedAt.slice(0, 10) : today());
  const [dateTouched, setDateTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const qtyN = parseLocaleNumber(qty);
  const priceC = parseEuroToCents(price);
  const densityN = density.trim() ? parseLocaleNumber(density) : null;

  const errors = useMemo(() => {
    const v = m.validation;
    const e: Record<string, string | null> = {};
    const trimmed = name.trim();
    e.name = !trimmed
      ? v.required
      : trimmed.length > 120
        ? v.tooLong
        : existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
          ? t.duplicateName
          : null;
    e.qty = !qty.trim() ? v.required : qtyN == null ? v.number : qtyN <= 0 ? v.positive : null;
    e.price = !price.trim() ? v.required : priceC == null ? v.number : priceC < 0 ? v.nonNegative : null;
    e.density = density.trim() && (densityN == null || densityN < 0.01 || densityN > 10) ? v.density : null;
    return e;
  }, [name, qty, qtyN, price, priceC, density, densityN, existingNames, m, t]);
  const hasErrors = Object.values(errors).some(Boolean);
  const err = (k: string) => (submitted ? errors[k] : null);

  const preview =
    qtyN != null && qtyN > 0 && priceC != null && priceC >= 0
      ? costPerBaseUnit({ pricePaidCents: priceC, purchaseQuantity: qtyN, purchaseUnit: unit })
      : null;
  const priceIsChanging =
    initial != null && priceC != null && qtyN != null &&
    (priceC !== initial.pricePaidCents || qtyN !== initial.purchaseQuantity || unit !== initial.purchaseUnit);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // il dialog può essere aperto dentro un altro modulo (editor ricetta)
    setSubmitted(true);
    if (hasErrors || qtyN == null || priceC == null) return;
    const d = priceIsChanging && !dateTouched ? today() : date;
    onSave({
      id: initial?.id,
      name: name.trim(),
      category: category.trim(),
      purchaseQuantity: qtyN,
      purchaseUnit: unit,
      pricePaidCents: priceC,
      supplier: supplier.trim(),
      densityGPerMl: densityN,
      notes: notes.trim(),
      priceDate: `${d || today()}T12:00:00.000Z`,
    });
  };

  const history = initial ? priceSeries(initial) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t.formTitleEdit : t.formTitleNew}
      className="max-w-2xl"
      closeLabel={m.common.close}
    >
      <form onSubmit={submit} noValidate className="space-y-4" id="ingredient-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ing-name" label={t.fName} error={err("name")} className="sm:col-span-2">
            <Input {...fieldAria("ing-name", err("name"))} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fNamePh} autoFocus maxLength={120} />
          </Field>
          <Field id="ing-cat" label={t.fCategory} optional={m.common.optional}>
            <Input id="ing-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t.fCategoryPh} list="ing-cat-list" maxLength={60} />
            <datalist id="ing-cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field id="ing-sup" label={t.fSupplier} optional={m.common.optional}>
            <Input id="ing-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={t.fSupplierPh} maxLength={120} />
          </Field>
        </div>

        <div className="grid gap-4 rounded-xl bg-cream p-4 sm:grid-cols-3">
          <Field id="ing-qty" label={t.fQty} error={err("qty")}>
            <NumberInput {...fieldAria("ing-qty", err("qty"))} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field id="ing-unit" label={t.fUnit}>
            <Select id="ing-unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {UNITS.map((u) => <option key={u} value={u}>{m.units[u]}</option>)}
            </Select>
          </Field>
          <Field id="ing-price" label={t.fPrice} error={err("price")}>
            <NumberInput {...fieldAria("ing-price", err("price"))} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" suffix="€" />
          </Field>
          <div className="sm:col-span-3" aria-live="polite">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t.preview}</p>
            {preview?.ok && qtyN != null && priceC != null ? (
              <p className="mt-1 text-sm text-ink">
                <span className="font-serif text-xl font-semibold text-wine">{formatUnitCost(preview.costPerBase, preview.baseUnit)}</span>
                <span className="ml-2 text-ink-muted">
                  {t.previewFormula(formatEUR(priceC / 100), formatQty(toBase(qtyN, unit).toNumber(), baseUnitOf(unit)), formatUnitCost(preview.costPerBase, preview.baseUnit))}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-subtle">—</p>
            )}
            {priceIsChanging && <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><History className="size-3.5" aria-hidden />{t.historyNote}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ing-date" label={t.fDate}>
            <Input id="ing-date" type="date" value={date} max={today()} onChange={(e) => { setDate(e.target.value); setDateTouched(true); }} />
          </Field>
          <Field id="ing-density" label={t.fDensity} optional={m.common.optional} error={err("density")} hint={t.fDensityHint}>
            <NumberInput {...fieldAria("ing-density", err("density"), true)} value={density} onChange={(e) => setDensity(e.target.value)} placeholder="es. 1,03" suffix="g/ml" />
          </Field>
          <Field id="ing-notes" label={t.fNotes} optional={m.common.optional} className="sm:col-span-2">
            <Textarea id="ing-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>

        {history.length > 1 && (
          <details className="rounded-xl border border-line px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-ink">{t.history} ({history.length})</summary>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between tabular-nums">
                  <span>{formatDate(h.date)}</span>
                  <span>{formatUnitCost(h.costPerBase, baseUnitOf(initial!.purchaseUnit))}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {submitted && hasErrors && <p className="text-sm font-medium text-danger" role="alert">{m.validation.fixErrors}</p>}

        <div className="flex justify-end gap-2 border-t border-line/70 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{m.common.cancel}</Button>
          <Button type="submit">{m.common.save}</Button>
        </div>
      </form>
    </Dialog>
  );
}
