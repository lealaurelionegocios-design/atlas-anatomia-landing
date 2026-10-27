import type { BaseUnit, Ingredient, PricePoint } from "../domain/types";
import { fromCents, type Dec } from "./decimal";
import { baseUnitOf, toBase } from "./units";

export type IngredientCostResult =
  | { ok: true; baseUnit: BaseUnit; costPerBase: Dec }
  | { ok: false; error: "invalid_quantity" | "invalid_price" };

type PriceLike = Pick<PricePoint, "pricePaidCents" | "purchaseQuantity" | "purchaseUnit">;

/**
 * Costo per unità base (g, ml o pz).
 * Esempio: 1 kg a €1,80 → 1,80 / 1000 = €0,0018 per grammo.
 */
export function costPerBaseUnit(p: PriceLike): IngredientCostResult {
  if (!Number.isFinite(p.purchaseQuantity) || p.purchaseQuantity <= 0) return { ok: false, error: "invalid_quantity" };
  if (!Number.isFinite(p.pricePaidCents) || p.pricePaidCents < 0) return { ok: false, error: "invalid_price" };
  const baseQty = toBase(p.purchaseQuantity, p.purchaseUnit);
  return { ok: true, baseUnit: baseUnitOf(p.purchaseUnit), costPerBase: fromCents(p.pricePaidCents).div(baseQty) };
}

export const ingredientCostPerBase = (ing: Ingredient) => costPerBaseUnit(ing);

/** True se il nuovo prezzo/confezione cambia il costo e va registrato nello storico. */
export function priceChanged(prev: PriceLike, next: PriceLike): boolean {
  return (
    prev.pricePaidCents !== next.pricePaidCents ||
    prev.purchaseQuantity !== next.purchaseQuantity ||
    prev.purchaseUnit !== next.purchaseUnit
  );
}

/** Storico + prezzo attuale, ordinati per data, come costo per unità base. */
export function priceSeries(ing: Ingredient): { date: string; costPerBase: Dec }[] {
  const points: PricePoint[] = [
    ...ing.priceHistory,
    { date: ing.updatedAt, pricePaidCents: ing.pricePaidCents, purchaseQuantity: ing.purchaseQuantity, purchaseUnit: ing.purchaseUnit },
  ];
  return points
    .map((p) => ({ date: p.date, r: costPerBaseUnit(p) }))
    .filter((x): x is { date: string; r: Extract<IngredientCostResult, { ok: true }> } => x.r.ok)
    .filter((x) => baseUnitOf(ing.purchaseUnit) === x.r.baseUnit)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => ({ date: x.date, costPerBase: x.r.costPerBase }));
}
