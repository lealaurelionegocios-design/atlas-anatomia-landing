import { describe, expect, it } from "vitest";
import { dashboardStats, ingredientContributions, summarizeAll } from "@/lib/calc/analytics";
import { calcRecipeCost, indexIngredients } from "@/lib/calc/recipe";
import { createDemoData, hasDemoData, removeDemoData } from "@/lib/domain/demo";
import { appDataSchema } from "@/lib/domain/schemas";
import { expectClose, expectDec, mkRecipe, NOW } from "./helpers";

/** Valori verificati a mano (vedi docs/FORMULE.md, sezione "Esempi"). */
describe("dati dimostrativi", () => {
  const data = createDemoData();
  const idx = indexIngredients(data.ingredients);
  const cost = (id: string) => calcRecipeCost(data.recipes.find((r) => r.id === id)!, idx);

  it("sono validi secondo lo schema e marcati come esempio", () => {
    expect(appDataSchema.safeParse(data).success).toBe(true);
    expect(data.recipes).toHaveLength(3);
    expect(data.recipes.every((r) => r.isDemo) && data.ingredients.every((i) => i.isDemo)).toBe(true);
  });

  it("Torta alle Fragole", () => {
    const c = cost("demo-rec-torta-fragole");
    expect(c.complete).toBe(true);
    expectDec(c.ingredientsCost, "8.87");
    expectDec(c.wasteCost, "0.4435");
    expectDec(c.laborCost, 18);
    expectDec(c.packagingCost, 2);
    expectDec(c.otherCost, "0.8");
    expectDec(c.totalCost, "30.1135");
    expectClose(c.unitCost, "2.509458333333333333333", 15);
  });

  it("Tiramisù", () => {
    const c = cost("demo-rec-tiramisu");
    expectDec(c.ingredientsCost, "9.22");
    expectDec(c.packagingCost, "2.8");
    expectDec(c.totalCost, "20.02");
    expectDec(c.unitCost, "2.5025");
  });

  it("Cupcake al Cioccolato", () => {
    const c = cost("demo-rec-cupcake");
    expectDec(c.ingredientsCost, "6.213");
    expectDec(c.wasteCost, "0.18639");
    expectDec(c.totalCost, "23.19939");
    expectDec(c.unitCost, "1.9332825");
  });

  it("prezzi suggeriti e margini ai prezzi attuali", () => {
    const s = summarizeAll(data);
    const by = (id: string) => s.find((x) => x.recipe.id === id)!;
    const torta = by("demo-rec-torta-fragole").pricing;
    const tira = by("demo-rec-tiramisu").pricing;
    const cup = by("demo-rec-cupcake").pricing;
    if (!torta.ok || !tira.ok || !cup.ok) throw new Error();
    expectDec(torta.suggested.gross, "6.3"); // 2,5095 / 0,40 = 6,2736 → 6,30
    expectDec(tira.suggested.gross, "5.6"); // 2,5025 / 0,45 = 5,5611 → 5,60
    expectDec(cup.suggested.gross, "3.9"); // 1,9333 / 0,50 = 3,8666 → 3,90
    expectClose(by("demo-rec-torta-fragole").currentMarginPercent, "44.23425925925925925926", 12);
    expectDec(by("demo-rec-tiramisu").currentMarginPercent, "49.95");
    expectClose(by("demo-rec-cupcake").currentMarginPercent, "44.76335714285714285714", 12);
  });

  it("statistiche del pannello", () => {
    const st = dashboardStats(data);
    expect(st.recipeCount).toBe(3);
    expectClose(st.avgBatchCost, "24.44429666666666666667", 12); // (30,1135 + 20,02 + 23,19939) / 3
    expectDec(st.avgPlannedMargin, 55);
    expectClose(st.avgSuggestedPrice, "5.266666666666666666667", 12);
    expect(st.best!.recipe.name).toBe("Tiramisù");
    expect(st.worst!.recipe.name).toBe("Torta alle Fragole");
  });

  it("ingredienti con maggior peso sui costi", () => {
    const top = ingredientContributions(summarizeAll(data));
    expect(top[0].name).toBe("Mascarpone"); // 4,50
    expectDec(top[0].total, "4.5");
    expect(top.find((t) => t.name === "Uova fresche")!.recipeCount).toBe(3);
    expectDec(top.find((t) => t.name === "Uova fresche")!.total, "4"); // 1,60 + 1,60 + 0,80
    const share = top.reduce((a, t) => a.plus(t.sharePercent), top[0].sharePercent.minus(top[0].sharePercent));
    expectClose(share, 100, 12);
  });

  it("rimozione esempi preserva gli ingredienti usati dall'utente", () => {
    const mine = mkRecipe({
      id: "mia", createdAt: NOW, updatedAt: NOW,
      items: [{ id: "i", ingredientId: "demo-ing-farina", quantity: 100, unit: "g" }],
    });
    const { data: cleaned, keptIngredients } = removeDemoData({ ...data, recipes: [...data.recipes, mine] });
    expect(cleaned.recipes.map((r) => r.id)).toEqual(["mia"]);
    expect(cleaned.ingredients.map((i) => i.id)).toEqual(["demo-ing-farina"]);
    expect(keptIngredients).toBe(1);
    const empty = removeDemoData(data).data;
    expect(hasDemoData(empty)).toBe(false);
    expect(empty.ingredients).toHaveLength(0);
  });
});
