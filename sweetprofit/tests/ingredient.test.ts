import { describe, expect, it } from "vitest";
import { costPerBaseUnit, priceChanged, priceSeries } from "@/lib/calc/ingredient";
import { expectDec, mkIngredient } from "./helpers";

describe("costo per unità base", () => {
  it("Farina 00 — 1 kg a €1,80 = €0,0018 al grammo", () => {
    const r = costPerBaseUnit(mkIngredient("farina", 1, "kg", 180));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.baseUnit).toBe("g");
      expectDec(r.costPerBase, "0.0018");
    }
  });

  it("litri → costo al ml, pezzi → costo al pezzo", () => {
    const l = costPerBaseUnit(mkIngredient("latte", 1, "l", 140));
    if (l.ok) { expect(l.baseUnit).toBe("ml"); expectDec(l.costPerBase, "0.0014"); }
    const p = costPerBaseUnit(mkIngredient("uova", 6, "pz", 240));
    if (p.ok) { expect(p.baseUnit).toBe("pz"); expectDec(p.costPerBase, "0.4"); }
  });

  it("quantità zero, negativa o mancante → errore", () => {
    expect(costPerBaseUnit(mkIngredient("x", 0, "g", 100))).toEqual({ ok: false, error: "invalid_quantity" });
    expect(costPerBaseUnit(mkIngredient("x", -2, "g", 100))).toEqual({ ok: false, error: "invalid_quantity" });
    expect(costPerBaseUnit(mkIngredient("x", NaN, "g", 100))).toEqual({ ok: false, error: "invalid_quantity" });
  });

  it("prezzo negativo → errore; prezzo zero ammesso (es. omaggio)", () => {
    expect(costPerBaseUnit(mkIngredient("x", 1, "kg", -1))).toEqual({ ok: false, error: "invalid_price" });
    const z = costPerBaseUnit(mkIngredient("x", 1, "kg", 0));
    if (z.ok) expectDec(z.costPerBase, 0);
  });

  it("rileva le variazioni di prezzo", () => {
    const a = { pricePaidCents: 100, purchaseQuantity: 1, purchaseUnit: "kg" as const };
    expect(priceChanged(a, { ...a })).toBe(false);
    expect(priceChanged(a, { ...a, pricePaidCents: 120 })).toBe(true);
    expect(priceChanged(a, { ...a, purchaseUnit: "g" })).toBe(true);
  });

  it("serie storica ordinata con prezzo attuale in coda", () => {
    const ing = mkIngredient("burro", 250, "g", 250, {
      updatedAt: "2026-09-01",
      priceHistory: [
        { date: "2026-04-01", pricePaidCents: 235, purchaseQuantity: 250, purchaseUnit: "g" },
        { date: "2026-01-01", pricePaidCents: 200, purchaseQuantity: 1, purchaseUnit: "kg" },
      ],
    });
    const s = priceSeries(ing);
    expect(s.map((p) => p.date)).toEqual(["2026-01-01", "2026-04-01", "2026-09-01"]);
    expectDec(s[0].costPerBase, "0.002");
    expectDec(s[1].costPerBase, "0.0094");
    expectDec(s[2].costPerBase, "0.01");
  });
});
