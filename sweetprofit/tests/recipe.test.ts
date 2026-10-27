import { describe, expect, it } from "vitest";
import { calcRecipeCost, indexIngredients, recipesUsingIngredient } from "@/lib/calc/recipe";
import { expectClose, expectDec, mkIngredient, mkRecipe } from "./helpers";

const farina = mkIngredient("farina", 1, "kg", 180);
const uova = mkIngredient("uova", 6, "pz", 240);
const latte = mkIngredient("latte", 1, "l", 140, { densityGPerMl: 1.03 });
const panna = mkIngredient("panna", 500, "ml", 250); // senza densità
const idx = indexIngredients([farina, uova, latte, panna]);

const base = mkRecipe({
  yieldQuantity: 10,
  items: [
    { id: "a", ingredientId: "farina", quantity: 500, unit: "g" }, // 0,90
    { id: "b", ingredientId: "uova", quantity: 3, unit: "pz" }, //    1,20
    { id: "c", ingredientId: "latte", quantity: 0.2, unit: "l" }, //  0,28
  ],
});

describe("costo ricetta", () => {
  it("costo proporzionale degli ingredienti", () => {
    const c = calcRecipeCost(base, idx);
    expect(c.complete).toBe(true);
    expectDec(c.items[0].cost, "0.9");
    expectDec(c.items[1].cost, "1.2");
    expectDec(c.items[2].cost, "0.28");
    expectDec(c.ingredientsCost, "2.38");
  });

  it("totale con scarti, manodopera, confezioni e altre spese", () => {
    const r = {
      ...base,
      wastePercent: 10, //                       0,238
      laborMinutes: 30, laborHourlyRateCents: 1500, // 7,50
      extraCosts: [
        { id: "p1", kind: "packaging" as const, label: "Scatola", amountCents: 50, basis: "unit" as const }, // 5,00
        { id: "p2", kind: "packaging" as const, label: "Nastro", amountCents: 100, basis: "batch" as const }, // 1,00
        { id: "o1", kind: "other" as const, label: "Gas", amountCents: 75, basis: "batch" as const }, //   0,75
      ],
    };
    const c = calcRecipeCost(r, idx);
    expectDec(c.wasteCost, "0.238");
    expectDec(c.laborCost, "7.5");
    expectDec(c.packagingCost, "6");
    expectDec(c.otherCost, "0.75");
    expectDec(c.totalCost, "16.868");
    expectDec(c.unitCost, "1.6868");
  });

  it("costo unitario con resa non intera", () => {
    const c = calcRecipeCost({ ...base, yieldQuantity: 3 }, idx);
    expectClose(c.unitCost, "0.7933333333333333");
  });

  it("resa alternativa ricalcola anche le voci per unità", () => {
    const r = { ...base, extraCosts: [{ id: "p", kind: "packaging" as const, label: "", amountCents: 10, basis: "unit" as const }] };
    const c = calcRecipeCost(r, idx, { yieldOverride: 5 });
    expectDec(c.packagingCost, "0.5");
    expectDec(c.unitCost, "0.576"); // (2,38 + 0,50) / 5
  });

  it("resa zero, negativa o non numerica → costo unitario non calcolabile", () => {
    for (const y of [0, -4, NaN]) {
      const c = calcRecipeCost({ ...base, yieldQuantity: y }, idx);
      expect(c.unitCost).toBeNull();
      expect(c.complete).toBe(false);
      expect(c.issues.map((i) => i.code)).toContain("yield_invalid");
    }
  });

  it("ingrediente mancante: segnalato ed escluso dal totale", () => {
    const r = { ...base, items: [...base.items, { id: "x", ingredientId: "fantasma", quantity: 1, unit: "g" as const }] };
    const c = calcRecipeCost(r, idx);
    expect(c.complete).toBe(false);
    expect(c.issues).toContainEqual({ code: "ingredient_missing", itemId: "x", ingredientName: undefined });
    expectDec(c.ingredientsCost, "2.38");
  });

  it("peso usato per ingrediente a volume senza densità → densità richiesta", () => {
    const r = { ...base, items: [{ id: "p", ingredientId: "panna", quantity: 100, unit: "g" as const }] };
    const c = calcRecipeCost(r, idx);
    expect(c.issues[0].code).toBe("density_required");
    expect(c.items[0].cost).toBeNull();
  });

  it("peso usato per ingrediente a volume con densità → convertito", () => {
    const r = { ...base, items: [{ id: "l", ingredientId: "latte", quantity: 103, unit: "g" as const }] };
    const c = calcRecipeCost(r, idx);
    expectDec(c.ingredientsCost, "0.14"); // 103 g / 1,03 = 100 ml × 0,0014
  });

  it("pezzi incompatibili con grammi", () => {
    const r = { ...base, items: [{ id: "u", ingredientId: "uova", quantity: 50, unit: "g" as const }] };
    expect(calcRecipeCost(r, idx).issues[0].code).toBe("unit_incompatible");
  });

  it("valori negativi segnalati", () => {
    const r = {
      ...base,
      items: [{ id: "n", ingredientId: "farina", quantity: -100, unit: "g" as const }],
      wastePercent: -5,
      laborMinutes: -10,
      extraCosts: [{ id: "e", kind: "other" as const, label: "", amountCents: -100, basis: "batch" as const }],
    };
    const codes = calcRecipeCost(r, idx).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["quantity_invalid", "waste_invalid", "labor_invalid", "extra_cost_invalid"]));
    expectDec(calcRecipeCost(r, idx).totalCost, 0);
  });

  it("ricetta vuota ha costo zero ma valido", () => {
    const c = calcRecipeCost(mkRecipe({ yieldQuantity: 4 }), idx);
    expect(c.complete).toBe(true);
    expectDec(c.totalCost, 0);
    expectDec(c.unitCost, 0);
  });
});

describe("ricalcolo e ingredienti condivisi", () => {
  const r1 = mkRecipe({ id: "r1", items: [{ id: "1", ingredientId: "farina", quantity: 200, unit: "g" }] });
  const r2 = mkRecipe({ id: "r2", items: [{ id: "2", ingredientId: "farina", quantity: 1.5, unit: "kg" }] });
  const r3 = mkRecipe({ id: "r3", items: [{ id: "3", ingredientId: "uova", quantity: 2, unit: "pz" }] });

  it("variazione di prezzo si riflette su tutte le ricette collegate", () => {
    const before = indexIngredients([farina, uova]);
    expectDec(calcRecipeCost(r1, before).totalCost, "0.36");
    expectDec(calcRecipeCost(r2, before).totalCost, "2.7");

    const after = indexIngredients([{ ...farina, pricePaidCents: 240 }, uova]);
    expectDec(calcRecipeCost(r1, after).totalCost, "0.48");
    expectDec(calcRecipeCost(r2, after).totalCost, "3.6");
    expectDec(calcRecipeCost(r3, after).totalCost, "0.8"); // non collegata: invariata
  });

  it("cambio di confezione (es. 1 kg → 5 kg) ricalcola il costo unitario", () => {
    const after = indexIngredients([{ ...farina, purchaseQuantity: 5, pricePaidCents: 750 }]);
    expectDec(calcRecipeCost(r1, after).totalCost, "0.3");
  });

  it("individua le ricette che usano un ingrediente", () => {
    expect(recipesUsingIngredient([r1, r2, r3], "farina").map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
