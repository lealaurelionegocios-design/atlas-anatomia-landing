import { priceChanged } from "../calc/ingredient";
import { newId } from "../utils/id";
import type { AppData, Ingredient, Recipe, Settings } from "./types";

/**
 * Operazioni pure sui dati: ricevono lo stato e ne restituiscono uno nuovo.
 * Così sono testabili e indipendenti dall'interfaccia e dal salvataggio.
 */

export type IngredientDraft = Omit<Ingredient, "id" | "createdAt" | "updatedAt" | "priceHistory" | "isDemo"> & {
  id?: string;
  /** Data del prezzo (ISO); se assente si usa "adesso". */
  priceDate?: string;
};

export function upsertIngredient(data: AppData, draft: IngredientDraft, now = new Date().toISOString()): AppData {
  const { priceDate, ...fields } = draft;
  const prev = draft.id ? data.ingredients.find((i) => i.id === draft.id) : undefined;
  if (!prev) {
    const created: Ingredient = {
      ...fields, id: draft.id ?? newId("ing"), isDemo: false, createdAt: now, updatedAt: priceDate ?? now, priceHistory: [],
    };
    return { ...data, ingredients: [...data.ingredients, created] };
  }
  const changed = priceChanged(prev, fields);
  const updated: Ingredient = {
    ...prev,
    ...fields,
    id: prev.id,
    updatedAt: changed ? (priceDate ?? now) : (priceDate ?? prev.updatedAt),
    priceHistory: changed
      ? [
          ...prev.priceHistory,
          { date: prev.updatedAt, pricePaidCents: prev.pricePaidCents, purchaseQuantity: prev.purchaseQuantity, purchaseUnit: prev.purchaseUnit },
        ]
      : prev.priceHistory,
  };
  return { ...data, ingredients: data.ingredients.map((i) => (i.id === prev.id ? updated : i)) };
}

export function duplicateIngredient(data: AppData, id: string, suffix: string, now = new Date().toISOString()): AppData {
  const src = data.ingredients.find((i) => i.id === id);
  if (!src) return data;
  const copy: Ingredient = { ...structuredClone(src), id: newId("ing"), name: src.name + suffix, isDemo: false, createdAt: now, updatedAt: now, priceHistory: [] };
  return { ...data, ingredients: [...data.ingredients, copy] };
}

/** Elimina un ingrediente solo se nessuna ricetta lo usa. */
export function deleteIngredient(data: AppData, id: string): { ok: true; data: AppData } | { ok: false; usedBy: Recipe[] } {
  const usedBy = data.recipes.filter((r) => r.items.some((it) => it.ingredientId === id));
  if (usedBy.length) return { ok: false, usedBy };
  return { ok: true, data: { ...data, ingredients: data.ingredients.filter((i) => i.id !== id) } };
}

export type RecipeDraft = Omit<Recipe, "id" | "createdAt" | "updatedAt" | "isDemo"> & { id?: string };

export function upsertRecipe(data: AppData, draft: RecipeDraft, now = new Date().toISOString()): { data: AppData; id: string } {
  const prev = draft.id ? data.recipes.find((r) => r.id === draft.id) : undefined;
  if (!prev) {
    const created: Recipe = { ...draft, id: draft.id ?? newId("rec"), isDemo: false, createdAt: now, updatedAt: now };
    return { data: { ...data, recipes: [...data.recipes, created] }, id: created.id };
  }
  const updated: Recipe = { ...prev, ...draft, id: prev.id, updatedAt: now };
  return { data: { ...data, recipes: data.recipes.map((r) => (r.id === prev.id ? updated : r)) }, id: prev.id };
}

export function duplicateRecipe(data: AppData, id: string, suffix: string, now = new Date().toISOString()): AppData {
  const src = data.recipes.find((r) => r.id === id);
  if (!src) return data;
  const copy: Recipe = {
    ...structuredClone(src),
    id: newId("rec"),
    name: src.name + suffix,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
    items: src.items.map((it) => ({ ...it, id: newId("item") })),
    extraCosts: src.extraCosts.map((c) => ({ ...c, id: newId("cost") })),
  };
  return { ...data, recipes: [...data.recipes, copy] };
}

export const deleteRecipe = (data: AppData, id: string): AppData => ({ ...data, recipes: data.recipes.filter((r) => r.id !== id) });

export const updateSettings = (data: AppData, patch: Partial<Settings>): AppData => ({ ...data, settings: { ...data.settings, ...patch } });
