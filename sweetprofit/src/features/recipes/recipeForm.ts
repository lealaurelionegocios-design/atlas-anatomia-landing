import type { CostBasis, CostKind, Recipe, Settings, Unit } from "@/lib/domain/types";
import type { RecipeDraft } from "@/lib/domain/actions";
import type { Messages } from "@/lib/i18n";
import { newId } from "@/lib/utils/id";
import { centsToInput, numberToInput, parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";

/** Stato del modulo ricetta: i numeri restano testo finché non vengono validati. */
export interface LineState { id: string; ingredientId: string; qty: string; unit: Unit }
export interface ExtraState { id: string; kind: CostKind; label: string; amount: string; basis: CostBasis }
export interface RecipeFormState {
  id: string | null;
  name: string;
  category: string;
  yieldQty: string;
  yieldUnit: string;
  lines: LineState[];
  laborMinutes: string;
  laborRate: string;
  extras: ExtraState[];
  waste: string;
  targetMargin: string;
  currentPrice: string;
  notes: string;
}

export function formFromRecipe(r: Recipe | null, s: Settings): RecipeFormState {
  if (!r)
    return {
      id: null, name: "", category: "", yieldQty: "1", yieldUnit: "porzioni", lines: [], laborMinutes: "0",
      laborRate: centsToInput(s.defaultHourlyRateCents), extras: [], waste: "0", targetMargin: "", currentPrice: "", notes: "",
    };
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    yieldQty: numberToInput(r.yieldQuantity),
    yieldUnit: r.yieldUnit,
    lines: r.items.map((i) => ({ id: i.id, ingredientId: i.ingredientId, qty: numberToInput(i.quantity), unit: i.unit })),
    laborMinutes: numberToInput(r.laborMinutes),
    laborRate: centsToInput(r.laborHourlyRateCents),
    extras: r.extraCosts.map((c) => ({ id: c.id, kind: c.kind, label: c.label, amount: centsToInput(c.amountCents), basis: c.basis })),
    waste: numberToInput(r.wastePercent),
    targetMargin: numberToInput(r.targetMarginPercent),
    currentPrice: centsToInput(r.currentPriceCents),
    notes: r.notes,
  };
}

const num = (s: string) => parseLocaleNumber(s) ?? NaN;
const cents = (s: string) => parseEuroToCents(s) ?? NaN;
const optional = <T,>(s: string, f: (s: string) => T): T | null => (s.trim() ? f(s) : null);

/** Ricetta "provvisoria" per l'anteprima dei costi (i valori non validi diventano NaN e generano avvisi). */
export function draftFromForm(f: RecipeFormState): RecipeDraft {
  return {
    id: f.id ?? undefined,
    name: f.name.trim(),
    category: f.category.trim(),
    yieldQuantity: num(f.yieldQty),
    yieldUnit: f.yieldUnit.trim(),
    items: f.lines.filter((l) => l.ingredientId).map((l) => ({ id: l.id, ingredientId: l.ingredientId, quantity: num(l.qty), unit: l.unit })),
    laborMinutes: f.laborMinutes.trim() ? num(f.laborMinutes) : 0,
    laborHourlyRateCents: f.laborRate.trim() ? cents(f.laborRate) : 0,
    extraCosts: f.extras.map((e) => ({ id: e.id, kind: e.kind, label: e.label.trim(), amountCents: e.amount.trim() ? cents(e.amount) : 0, basis: e.basis })),
    wastePercent: f.waste.trim() ? num(f.waste) : 0,
    targetMarginPercent: optional(f.targetMargin, num),
    currentPriceCents: optional(f.currentPrice, cents),
    notes: f.notes.trim(),
  };
}

export type FormErrors = Record<string, string>;

export function validateForm(f: RecipeFormState, m: Messages): FormErrors {
  const v = m.validation;
  const e: FormErrors = {};
  const d = draftFromForm(f);
  if (!d.name) e.name = v.required;
  else if (d.name.length > 120) e.name = v.tooLong;
  if (!f.yieldQty.trim()) e.yieldQty = v.required;
  else if (Number.isNaN(d.yieldQuantity)) e.yieldQty = v.number;
  else if (d.yieldQuantity <= 0) e.yieldQty = v.positive;
  for (const l of f.lines) {
    const q = num(l.qty);
    if (!l.ingredientId || !l.qty.trim() || Number.isNaN(q) || q <= 0) e[`line-${l.id}`] = m.editor.lineInvalid;
  }
  if (Number.isNaN(d.laborMinutes)) e.laborMinutes = v.number;
  else if (d.laborMinutes < 0) e.laborMinutes = v.nonNegative;
  if (Number.isNaN(d.laborHourlyRateCents)) e.laborRate = v.number;
  else if (d.laborHourlyRateCents < 0) e.laborRate = v.nonNegative;
  for (const x of d.extraCosts) {
    if (Number.isNaN(x.amountCents)) e[`extra-${x.id}`] = v.number;
    else if (x.amountCents < 0) e[`extra-${x.id}`] = v.nonNegative;
  }
  if (Number.isNaN(d.wastePercent) || d.wastePercent < 0 || d.wastePercent >= 100) e.waste = v.percent;
  if (d.targetMarginPercent != null && (Number.isNaN(d.targetMarginPercent) || d.targetMarginPercent < 0 || d.targetMarginPercent >= 100))
    e.targetMargin = v.percent;
  if (d.currentPriceCents != null && (Number.isNaN(d.currentPriceCents) || d.currentPriceCents < 0)) e.currentPrice = v.number;
  return e;
}

export const newLine = (): LineState => ({ id: newId("item"), ingredientId: "", qty: "", unit: "g" });
export const newExtra = (kind: CostKind): ExtraState => ({ id: newId("cost"), kind, label: "", amount: "", basis: kind === "packaging" ? "unit" : "batch" });
