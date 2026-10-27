import type { Ingredient, Recipe, RecipeItem } from "../domain/types";
import { D, dec, fromCents, pctToRatio, ZERO, type Dec } from "./decimal";
import { costPerBaseUnit } from "./ingredient";
import { baseUnitOf, convertQuantity } from "./units";

export type RecipeIssueCode =
  | "yield_invalid"
  | "ingredient_missing"
  | "ingredient_price_invalid"
  | "quantity_invalid"
  | "unit_incompatible"
  | "density_required"
  | "waste_invalid"
  | "labor_invalid"
  | "extra_cost_invalid";

export interface RecipeIssue {
  code: RecipeIssueCode;
  itemId?: string;
  ingredientName?: string;
}

export interface ItemCost {
  itemId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: RecipeItem["unit"];
  /** null se il costo non è calcolabile (vedi issues). */
  cost: Dec | null;
}

export interface RecipeCost {
  /** False se manca qualche dato: i totali escludono le voci non calcolabili. */
  complete: boolean;
  issues: RecipeIssue[];
  items: ItemCost[];
  yieldQuantity: number;
  ingredientsCost: Dec;
  wasteCost: Dec;
  laborCost: Dec;
  packagingCost: Dec;
  otherCost: Dec;
  totalCost: Dec;
  /** Costo per unità prodotta; null se la resa non è valida. */
  unitCost: Dec | null;
}

export type IngredientIndex = Map<string, Ingredient>;
export const indexIngredients = (list: Ingredient[]): IngredientIndex => new Map(list.map((i) => [i.id, i]));

/** Costo di una singola riga di ricetta. */
export function itemCost(item: RecipeItem, ing: Ingredient | undefined): { cost: Dec | null; issue?: RecipeIssueCode } {
  if (!ing) return { cost: null, issue: "ingredient_missing" };
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return { cost: null, issue: "quantity_invalid" };
  const unitCost = costPerBaseUnit(ing);
  if (!unitCost.ok) return { cost: null, issue: "ingredient_price_invalid" };
  const conv = convertQuantity(item.quantity, item.unit, baseUnitOf(ing.purchaseUnit), ing.densityGPerMl);
  if (!conv.ok) return { cost: null, issue: conv.error === "density_required" ? "density_required" : "unit_incompatible" };
  return { cost: conv.value.mul(unitCost.costPerBase) };
}

export interface RecipeCostOptions {
  /** Resa alternativa (es. stessa torta tagliata in 10 fette invece di 12). */
  yieldOverride?: number;
}

/**
 * Calcola i costi di una ricetta.
 *
 * Totale = ingredienti + scarti + manodopera + confezionamento + altre spese
 * - scarti        = ingredienti × % scarto
 * - manodopera    = minuti / 60 × costo orario
 * - voci "unit"   = importo × resa; voci "batch" = importo
 * Costo unitario = Totale / resa
 */
export function calcRecipeCost(recipe: Recipe, ingredients: IngredientIndex, opts: RecipeCostOptions = {}): RecipeCost {
  const issues: RecipeIssue[] = [];
  const yieldQuantity = opts.yieldOverride ?? recipe.yieldQuantity;
  const yieldValid = Number.isFinite(yieldQuantity) && yieldQuantity > 0;
  if (!yieldValid) issues.push({ code: "yield_invalid" });
  const units = yieldValid ? dec(yieldQuantity) : ZERO;

  const items: ItemCost[] = recipe.items.map((item) => {
    const ing = ingredients.get(item.ingredientId);
    const r = itemCost(item, ing);
    if (r.issue) issues.push({ code: r.issue, itemId: item.id, ingredientName: ing?.name });
    return {
      itemId: item.id,
      ingredientId: item.ingredientId,
      ingredientName: ing?.name ?? "—",
      quantity: item.quantity,
      unit: item.unit,
      cost: r.cost,
    };
  });

  const ingredientsCost = items.reduce((acc, i) => (i.cost ? acc.plus(i.cost) : acc), ZERO);

  let wasteCost = ZERO;
  if (!Number.isFinite(recipe.wastePercent) || recipe.wastePercent < 0 || recipe.wastePercent >= 100) {
    issues.push({ code: "waste_invalid" });
  } else {
    wasteCost = ingredientsCost.mul(pctToRatio(recipe.wastePercent));
  }

  let laborCost = ZERO;
  if (
    !Number.isFinite(recipe.laborMinutes) || recipe.laborMinutes < 0 ||
    !Number.isFinite(recipe.laborHourlyRateCents) || recipe.laborHourlyRateCents < 0
  ) {
    issues.push({ code: "labor_invalid" });
  } else {
    laborCost = dec(recipe.laborMinutes).div(60).mul(fromCents(recipe.laborHourlyRateCents));
  }

  let packagingCost = ZERO;
  let otherCost = ZERO;
  for (const c of recipe.extraCosts) {
    if (!Number.isFinite(c.amountCents) || c.amountCents < 0) {
      issues.push({ code: "extra_cost_invalid" });
      continue;
    }
    const amount = c.basis === "unit" ? fromCents(c.amountCents).mul(units) : fromCents(c.amountCents);
    if (c.kind === "packaging") packagingCost = packagingCost.plus(amount);
    else otherCost = otherCost.plus(amount);
  }

  const totalCost = ingredientsCost.plus(wasteCost).plus(laborCost).plus(packagingCost).plus(otherCost);
  return {
    complete: issues.length === 0,
    issues,
    items,
    yieldQuantity,
    ingredientsCost,
    wasteCost,
    laborCost,
    packagingCost,
    otherCost,
    totalCost,
    unitCost: yieldValid ? totalCost.div(units) : null,
  };
}

/** Ricette che usano un determinato ingrediente. */
export const recipesUsingIngredient = (recipes: Recipe[], ingredientId: string): Recipe[] =>
  recipes.filter((r) => r.items.some((i) => i.ingredientId === ingredientId));

export { D };
