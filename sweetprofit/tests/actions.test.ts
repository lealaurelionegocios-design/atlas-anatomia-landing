import { describe, expect, it } from "vitest";
import { deleteIngredient, duplicateRecipe, upsertIngredient, upsertRecipe } from "@/lib/domain/actions";
import { createDemoData } from "@/lib/domain/demo";
import { summarizeAll } from "@/lib/calc/analytics";
import { expectDec } from "./helpers";

describe("operazioni sui dati", () => {
  it("aggiornare il prezzo registra lo storico e ricalcola le ricette collegate", () => {
    const data = createDemoData();
    const farina = data.ingredients.find((i) => i.id === "demo-ing-farina")!;
    const before = summarizeAll(data).find((s) => s.recipe.id === "demo-rec-torta-fragole")!.cost.totalCost;
    const next = upsertIngredient(data, { ...farina, pricePaidCents: 240, priceDate: "2026-10-20T00:00:00.000Z" });
    const f2 = next.ingredients.find((i) => i.id === farina.id)!;
    expect(f2.priceHistory).toHaveLength(farina.priceHistory.length + 1);
    expect(f2.priceHistory.at(-1)).toEqual({ date: farina.updatedAt, pricePaidCents: 180, purchaseQuantity: 1, purchaseUnit: "kg" });
    expect(f2.updatedAt).toBe("2026-10-20T00:00:00.000Z");
    const after = summarizeAll(next).find((s) => s.recipe.id === "demo-rec-torta-fragole")!.cost.totalCost;
    expectDec(after.minus(before), "0.126"); // 200 g × 0,0006 €/g × 1,05 (scarto 5%)
  });

  it("modificare solo il nome non crea storico", () => {
    const data = createDemoData();
    const farina = data.ingredients[0];
    const next = upsertIngredient(data, { ...farina, name: "Farina tipo 00" });
    expect(next.ingredients[0].priceHistory).toEqual(farina.priceHistory);
    expect(next.ingredients[0].name).toBe("Farina tipo 00");
  });

  it("nuovo ingrediente non è un esempio", () => {
    const data = createDemoData();
    const next = upsertIngredient(data, {
      name: "Pistacchi", category: "Frutta secca", purchaseQuantity: 1, purchaseUnit: "kg", pricePaidCents: 2800,
      supplier: "", densityGPerMl: null, notes: "",
    });
    expect(next.ingredients.at(-1)!.isDemo).toBe(false);
    expect(next.ingredients).toHaveLength(data.ingredients.length + 1);
  });

  it("non si può eliminare un ingrediente usato", () => {
    const data = createDemoData();
    const r = deleteIngredient(data, "demo-ing-uova");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.usedBy).toHaveLength(3);
    const noRecipes = { ...data, recipes: [] };
    const ok = deleteIngredient(noRecipes, "demo-ing-uova");
    expect(ok.ok && ok.data.ingredients.some((i) => i.id === "demo-ing-uova")).toBe(false);
  });

  it("duplicare una ricetta produce costi identici e id nuovi", () => {
    const data = createDemoData();
    const next = duplicateRecipe(data, "demo-rec-tiramisu", " (copia)");
    const copy = next.recipes.at(-1)!;
    expect(copy.name).toBe("Tiramisù (copia)");
    expect(copy.isDemo).toBe(false);
    expect(copy.items.map((i) => i.id)).not.toEqual(data.recipes[1].items.map((i) => i.id));
    const s = summarizeAll(next);
    expectDec(s.at(-1)!.cost.totalCost, s[1].cost.totalCost.toString());
  });

  it("upsertRecipe crea e poi aggiorna", () => {
    const data = createDemoData();
    const { data: d1, id } = upsertRecipe(data, { ...data.recipes[0], id: undefined, name: "Nuova" });
    expect(d1.recipes).toHaveLength(4);
    const { data: d2 } = upsertRecipe(d1, { ...d1.recipes[3], id, yieldQuantity: 6 });
    expect(d2.recipes.find((r) => r.id === id)!.yieldQuantity).toBe(6);
    expect(d2.recipes).toHaveLength(4);
  });
});
