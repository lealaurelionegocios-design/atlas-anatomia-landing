import { describe, expect, it } from "vitest";
import { dec } from "@/lib/calc/decimal";
import { calcPricing, evaluatePrice, marginLadder, roundPrice, type PricingInput } from "@/lib/calc/pricing";
import { expectClose, expectDec } from "./helpers";

const input = (o: Partial<PricingInput> = {}): PricingInput => ({
  unitCost: dec(5), yieldQuantity: 1, fixedCostPerBatch: dec(0), marginPercent: 50, feePercent: 0, vatPercent: 0,
  roundingStepCents: 1, roundingMode: "up", comparePrice: null, ...o,
});

function ok(i: PricingInput) {
  const r = calcPricing(i);
  if (!r.ok) throw new Error("errore inatteso: " + r.error);
  return r;
}

describe("margine e prezzo suggerito", () => {
  it("costo €5 e margine 50% → prezzo €10", () => {
    const r = ok(input());
    expectDec(r.suggested.gross, 10);
    expectDec(r.suggested.marginPercent, 50);
    expectDec(r.suggested.contribution, 5);
  });

  it("margine 0% → prezzo = costo", () => {
    expectDec(ok(input({ marginPercent: 0 })).suggested.gross, 5);
  });

  it("margine ≠ ricarico: margine 50% equivale a ricarico 100%", () => {
    const r = ok(input());
    expectDec(r.suggested.markupPercent, 100);
    const e = evaluatePrice(dec(8), dec(5), 0, 0);
    expectDec(e.markupPercent, 60); // (8−5)/5
    expectDec(e.marginPercent, "37.5"); // (8−5)/8
  });

  it("margine 75% → prezzo = costo × 4", () => {
    expectDec(ok(input({ marginPercent: 75 })).suggested.gross, 20);
  });
});

describe("commissioni e IVA", () => {
  it("Prezzo = Costo / (1 − margine − commissioni)", () => {
    const r = ok(input({ feePercent: 10 }));
    expectDec(r.suggested.gross, "12.5");
    expectDec(r.suggested.fees, "1.25");
    expectDec(r.suggested.contribution, "6.25");
    expectDec(r.suggested.marginPercent, 50);
  });

  it("IVA: prezzo netto con margine pieno, prezzo al cliente IVA inclusa", () => {
    const r = ok(input({ vatPercent: 10 }));
    expectDec(r.suggested.gross, 11);
    expectDec(r.suggested.net, 10);
    expectDec(r.suggested.vat, 1);
    expectDec(r.suggested.marginPercent, 50);
  });

  it("commissioni sul prezzo IVA inclusa: il margine resta quello richiesto", () => {
    const r = ok(input({ vatPercent: 10, feePercent: 10, roundingStepCents: 1 }));
    expectClose(r.exactPrice, "14.10256410256410256410");
    expectDec(r.suggested.gross, "14.11");
    // margine all'esatto = 50%; al prezzo arrotondato per eccesso ≥ 50%
    expect(r.suggested.marginPercent!.gte(50)).toBe(true);
  });

  it("somma percentuali ≥ 100% → errore", () => {
    expect(calcPricing(input({ marginPercent: 60, feePercent: 40 }))).toEqual({ ok: false, error: "percent_sum_invalid" });
    expect(calcPricing(input({ marginPercent: 50, feePercent: 46, vatPercent: 10 }))).toEqual({ ok: false, error: "percent_sum_invalid" });
    expect(calcPricing(input({ marginPercent: 100 }))).toEqual({ ok: false, error: "margin_invalid" });
  });

  it("valori negativi o mancanti → errore", () => {
    expect(calcPricing(input({ marginPercent: -1 }))).toEqual({ ok: false, error: "margin_invalid" });
    expect(calcPricing(input({ feePercent: -1 }))).toEqual({ ok: false, error: "fee_invalid" });
    expect(calcPricing(input({ vatPercent: -1 }))).toEqual({ ok: false, error: "vat_invalid" });
    expect(calcPricing(input({ unitCost: dec(-1) }))).toEqual({ ok: false, error: "cost_invalid" });
    expect(calcPricing(input({ marginPercent: NaN }))).toEqual({ ok: false, error: "margin_invalid" });
    expect(calcPricing(input({ yieldQuantity: 0 }))).toEqual({ ok: false, error: "yield_invalid" });
  });
});

describe("costi fissi aggiuntivi", () => {
  it("ripartiti sulla resa, senza doppio conteggio", () => {
    const r = ok(input({ unitCost: dec(2), yieldQuantity: 10, fixedCostPerBatch: dec(10) }));
    expectDec(r.fixedCostPerUnit, 1);
    expectDec(r.fullUnitCost, 3);
    expectDec(r.batchCost, 30);
    expectDec(r.suggested.gross, 6);
    expectDec(r.suggestedBatchContribution, 30);
  });
});

describe("arrotondamento", () => {
  it("per eccesso al multiplo indicato", () => {
    expectDec(roundPrice(dec("6.2736"), 10, "up"), "6.3");
    expectDec(roundPrice(dec("6.2736"), 50, "up"), "6.5");
    expectDec(roundPrice(dec("6.2736"), 100, "up"), 7);
    expectDec(roundPrice(dec("6.2736"), 1, "up"), "6.28");
    expectDec(roundPrice(dec("6.2001"), 10, "up"), "6.3");
  });

  it("al più vicino (half up)", () => {
    expectDec(roundPrice(dec("6.2736"), 10, "nearest"), "6.3");
    expectDec(roundPrice(dec("6.24"), 10, "nearest"), "6.2");
    expectDec(roundPrice(dec("6.25"), 10, "nearest"), "6.3");
    expectDec(roundPrice(dec("1.005"), 1, "nearest"), "1.01");
    expectDec(roundPrice(dec("6.2736"), 5, "nearest"), "6.25");
  });

  it("valori già arrotondati restano invariati", () => {
    expectDec(roundPrice(dec(10), 10, "up"), 10);
    expectDec(roundPrice(dec("0.1").plus(dec("0.2")), 10, "up"), "0.3");
  });

  it("dopo l'arrotondamento il margine viene ricalcolato sul prezzo reale", () => {
    const r = ok(input({ unitCost: dec(3), marginPercent: 55, roundingStepCents: 50 }));
    expectClose(r.exactPrice, "6.666666666666666666667", 15);
    expectDec(r.suggested.gross, 7);
    expectClose(r.suggested.marginPercent, "57.1428571428571", 10);
  });
});

describe("prezzo alternativo", () => {
  it("confronto tra prezzo attuale e suggerito", () => {
    const r = ok(input({ comparePrice: dec(8), yieldQuantity: 4 }));
    expectDec(r.compare!.marginPercent, "37.5");
    expectDec(r.compare!.contribution, 3);
    expectDec(r.compareBatchContribution, 12);
    expectDec(r.priceDifference, -2);
  });

  it("prezzo sotto costo → margine negativo", () => {
    const r = ok(input({ comparePrice: dec(4) }));
    expectDec(r.compare!.contribution, -1);
    expectDec(r.compare!.marginPercent, -25);
  });

  it("prezzo zero → margine non definito", () => {
    expect(evaluatePrice(dec(0), dec(5), 0, 0).marginPercent).toBeNull();
    expect(evaluatePrice(dec(5), dec(0), 0, 0).markupPercent).toBeNull();
  });

  it("scala dei margini include il margine scelto", () => {
    expect(marginLadder(55)).toEqual([20, 30, 40, 50, 55, 60, 70]);
    expect(marginLadder(50)).toEqual([20, 30, 40, 50, 60, 70]);
  });
});
