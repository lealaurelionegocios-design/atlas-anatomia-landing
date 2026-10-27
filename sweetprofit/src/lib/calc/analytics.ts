import type { AppData, Recipe } from "../domain/types";
import { dec, fromCents, ZERO, type Dec } from "./decimal";
import { calcPricing, type PricingOutcome } from "./pricing";
import { calcRecipeCost, indexIngredients, type IngredientIndex, type RecipeCost } from "./recipe";

export interface RecipeSummary {
  recipe: Recipe;
  cost: RecipeCost;
  targetMarginPercent: number;
  pricing: PricingOutcome;
  /** Margine al prezzo attuale, se impostato. */
  currentMarginPercent: Dec | null;
  /** Margine di riferimento: al prezzo attuale se presente, altrimenti quello pianificato. */
  referenceMarginPercent: Dec | null;
  referenceSource: "current" | "planned";
}

export function summarizeRecipe(recipe: Recipe, idx: IngredientIndex, data: AppData): RecipeSummary {
  const s = data.settings;
  const cost = calcRecipeCost(recipe, idx);
  const targetMarginPercent = recipe.targetMarginPercent ?? s.defaultMarginPercent;
  const pricing: PricingOutcome =
    cost.unitCost == null
      ? { ok: false, error: "yield_invalid" }
      : calcPricing({
          unitCost: cost.unitCost,
          yieldQuantity: cost.yieldQuantity,
          fixedCostPerBatch: fromCents(s.defaultFixedCostPerBatchCents),
          marginPercent: targetMarginPercent,
          feePercent: s.defaultFeePercent,
          vatPercent: s.vatPercent,
          roundingStepCents: s.roundingStepCents,
          roundingMode: s.roundingMode,
          comparePrice: recipe.currentPriceCents != null ? fromCents(recipe.currentPriceCents) : null,
        });
  const currentMarginPercent = pricing.ok && pricing.compare ? pricing.compare.marginPercent : null;
  const plannedMargin = pricing.ok ? pricing.suggested.marginPercent : null;
  return {
    recipe,
    cost,
    targetMarginPercent,
    pricing,
    currentMarginPercent,
    referenceMarginPercent: currentMarginPercent ?? plannedMargin,
    referenceSource: currentMarginPercent != null ? "current" : "planned",
  };
}

export const summarizeAll = (data: AppData): RecipeSummary[] => {
  const idx = indexIngredients(data.ingredients);
  return data.recipes.map((r) => summarizeRecipe(r, idx, data));
};

const avg = (values: Dec[]): Dec | null =>
  values.length === 0 ? null : values.reduce((a, b) => a.plus(b), ZERO).div(values.length);

export interface DashboardStats {
  recipeCount: number;
  ingredientCount: number;
  /** Media del costo totale per ricetta (lotto). */
  avgBatchCost: Dec | null;
  avgUnitCost: Dec | null;
  /** Media dei prezzi suggeriti per unità. */
  avgSuggestedPrice: Dec | null;
  /** Media dei margini pianificati (obiettivo). */
  avgPlannedMargin: Dec | null;
  best: RecipeSummary | null;
  worst: RecipeSummary | null;
  incompleteCount: number;
}

export function dashboardStats(data: AppData, summaries = summarizeAll(data)): DashboardStats {
  const valid = summaries.filter((s) => s.cost.unitCost != null);
  const priced = summaries.filter((s) => s.pricing.ok);
  const withMargin = summaries
    .filter((s) => s.referenceMarginPercent != null)
    .sort((a, b) => b.referenceMarginPercent!.comparedTo(a.referenceMarginPercent!));
  return {
    recipeCount: data.recipes.length,
    ingredientCount: data.ingredients.length,
    avgBatchCost: avg(valid.map((s) => s.cost.totalCost)),
    avgUnitCost: avg(valid.map((s) => s.cost.unitCost!)),
    avgSuggestedPrice: avg(priced.map((s) => (s.pricing.ok ? s.pricing.suggested.gross : ZERO))),
    avgPlannedMargin: avg(summaries.map((s) => dec(s.targetMarginPercent))),
    best: withMargin[0] ?? null,
    worst: withMargin.length > 1 ? withMargin[withMargin.length - 1] : null,
    incompleteCount: summaries.filter((s) => !s.cost.complete).length,
  };
}

export interface IngredientContribution {
  ingredientId: string;
  name: string;
  /** Somma dei costi di questo ingrediente in tutte le ricette (un lotto ciascuna). */
  total: Dec;
  recipeCount: number;
  /** Quota sul costo ingredienti complessivo (0–100). */
  sharePercent: Dec;
}

export function ingredientContributions(summaries: RecipeSummary[]): IngredientContribution[] {
  const map = new Map<string, { name: string; total: Dec; recipes: Set<string> }>();
  for (const s of summaries) {
    for (const item of s.cost.items) {
      if (!item.cost) continue;
      const e = map.get(item.ingredientId) ?? { name: item.ingredientName, total: ZERO, recipes: new Set<string>() };
      e.total = e.total.plus(item.cost);
      e.recipes.add(s.recipe.id);
      map.set(item.ingredientId, e);
    }
  }
  const grand = [...map.values()].reduce((a, e) => a.plus(e.total), ZERO);
  return [...map.entries()]
    .map(([ingredientId, e]) => ({
      ingredientId,
      name: e.name,
      total: e.total,
      recipeCount: e.recipes.size,
      sharePercent: grand.isZero() ? ZERO : e.total.div(grand).mul(100),
    }))
    .sort((a, b) => b.total.comparedTo(a.total));
}
