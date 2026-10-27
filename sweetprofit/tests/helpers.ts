import type { Ingredient, Recipe, Unit } from "@/lib/domain/types";
import { dec, type Dec } from "@/lib/calc/decimal";
import { expect } from "vitest";

export const NOW = "2026-10-01T00:00:00.000Z";

export function mkIngredient(id: string, qty: number, unit: Unit, cents: number, extra: Partial<Ingredient> = {}): Ingredient {
  return {
    id, name: id, category: "", purchaseQuantity: qty, purchaseUnit: unit, pricePaidCents: cents, supplier: "",
    densityGPerMl: null, notes: "", isDemo: false, createdAt: NOW, updatedAt: NOW, priceHistory: [], ...extra,
  };
}

export function mkRecipe(extra: Partial<Recipe> = {}): Recipe {
  return {
    id: "r1", name: "Ricetta", category: "", yieldQuantity: 1, yieldUnit: "pezzi", items: [], laborMinutes: 0,
    laborHourlyRateCents: 0, extraCosts: [], wastePercent: 0, targetMarginPercent: null, currentPriceCents: null,
    notes: "", isDemo: false, createdAt: NOW, updatedAt: NOW, ...extra,
  };
}

/** Confronto esatto tra Decimal e un valore atteso. */
export function expectDec(actual: Dec | null | undefined, expected: number | string) {
  expect(actual, "valore nullo").not.toBeNull();
  expect(actual!.toString()).toBe(dec(expected).toString());
}

/** Confronto con tolleranza (per quozienti periodici). */
export function expectClose(actual: Dec | null | undefined, expected: number | string, places = 10) {
  expect(actual, "valore nullo").not.toBeNull();
  expect(actual!.toDecimalPlaces(places).toString()).toBe(dec(expected).toDecimalPlaces(places).toString());
}
