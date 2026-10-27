import type { RoundingMode, RoundingStep } from "../domain/types";
import { D, dec, fromCents, HUNDRED, pctToRatio, ZERO, type Dec } from "./decimal";

/**
 * MARGINE  = contribuzione / prezzo netto (IVA esclusa)  → quota del prezzo che resta
 * RICARICO = (prezzo netto − costo) / costo               → quanto si aggiunge al costo
 * Esempio: costo €5, prezzo €10 → margine 50%, ricarico 100%.
 *
 * Contribuzione per unità = prezzo netto − costo pieno − commissioni.
 * Non è l'utile netto: non considera imposte sul reddito né costi non inseriti.
 */

export interface PriceEvaluation {
  /** Prezzo pagato dal cliente (IVA inclusa, se applicata). */
  gross: Dec;
  /** Prezzo al netto dell'IVA. */
  net: Dec;
  vat: Dec;
  /** Commissioni calcolate sul prezzo pagato dal cliente. */
  fees: Dec;
  /** Costo pieno per unità (costo ricetta + quota costi fissi). */
  cost: Dec;
  contribution: Dec;
  /** Percentuale (es. 50 = 50%); null se il prezzo netto è zero. */
  marginPercent: Dec | null;
  /** Percentuale; null se il costo è zero. */
  markupPercent: Dec | null;
}

export function evaluatePrice(gross: Dec, cost: Dec, feePercent: number, vatPercent: number): PriceEvaluation {
  const net = gross.div(dec(1).plus(pctToRatio(vatPercent)));
  const vat = gross.minus(net);
  const fees = gross.mul(pctToRatio(feePercent));
  const contribution = net.minus(cost).minus(fees);
  return {
    gross,
    net,
    vat,
    fees,
    cost,
    contribution,
    marginPercent: net.isZero() ? null : contribution.div(net).mul(HUNDRED),
    markupPercent: cost.isZero() ? null : net.minus(cost).div(cost).mul(HUNDRED),
  };
}

/**
 * Arrotonda un prezzo a multipli di `stepCents` (1 = al centesimo).
 * - "up": per eccesso, così il margine reale non scende mai sotto l'obiettivo;
 * - "nearest": al multiplo più vicino (metà → per eccesso).
 */
export function roundPrice(price: Dec, stepCents: RoundingStep, mode: RoundingMode): Dec {
  const units = price.mul(100).div(stepCents);
  const rounded = mode === "up" ? units.ceil() : units.toDecimalPlaces(0, D.ROUND_HALF_UP);
  return rounded.mul(stepCents).div(100);
}

export type PricingError =
  | "cost_invalid"
  | "margin_invalid"
  | "fee_invalid"
  | "vat_invalid"
  | "percent_sum_invalid"
  | "yield_invalid";

export interface PricingInput {
  /** Costo per unità della ricetta (ingredienti, scarti, manodopera, confezioni, altre spese). */
  unitCost: Dec;
  yieldQuantity: number;
  /** Costi fissi aggiuntivi da ripartire sul lotto (non già inclusi nella ricetta). */
  fixedCostPerBatch: Dec;
  marginPercent: number;
  feePercent: number;
  vatPercent: number;
  roundingStepCents: RoundingStep;
  roundingMode: RoundingMode;
  /** Prezzo alternativo da simulare (prezzo al cliente). */
  comparePrice?: Dec | null;
}

export interface PricingResult {
  ok: true;
  fullUnitCost: Dec;
  fixedCostPerUnit: Dec;
  batchCost: Dec;
  /** Prezzo esatto prima dell'arrotondamento. */
  exactPrice: Dec;
  suggested: PriceEvaluation;
  compare: PriceEvaluation | null;
  /** Contribuzione sull'intero lotto al prezzo suggerito. */
  suggestedBatchContribution: Dec;
  compareBatchContribution: Dec | null;
  /** Differenza prezzo alternativo − prezzo suggerito. */
  priceDifference: Dec | null;
}

export type PricingOutcome = PricingResult | { ok: false; error: PricingError };

/**
 * Prezzo netto = Costo / (1 − Margine − Commissioni × (1 + IVA))
 * Senza IVA: Prezzo = Costo / (1 − Margine − Commissioni)
 * Prezzo al cliente = Prezzo netto × (1 + IVA), poi arrotondato secondo le preferenze.
 */
export function calcPricing(input: PricingInput): PricingOutcome {
  const { unitCost, yieldQuantity, fixedCostPerBatch, marginPercent, feePercent, vatPercent } = input;
  if (!Number.isFinite(yieldQuantity) || yieldQuantity <= 0) return { ok: false, error: "yield_invalid" };
  if (unitCost.isNaN() || unitCost.isNegative() || fixedCostPerBatch.isNaN() || fixedCostPerBatch.isNegative())
    return { ok: false, error: "cost_invalid" };
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) return { ok: false, error: "margin_invalid" };
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent >= 100) return { ok: false, error: "fee_invalid" };
  if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) return { ok: false, error: "vat_invalid" };

  const m = pctToRatio(marginPercent);
  const f = pctToRatio(feePercent);
  const v = pctToRatio(vatPercent);
  const denominator = dec(1).minus(m).minus(f.mul(dec(1).plus(v)));
  if (denominator.lte(0)) return { ok: false, error: "percent_sum_invalid" };

  const units = dec(yieldQuantity);
  const fixedCostPerUnit = fixedCostPerBatch.div(units);
  const fullUnitCost = unitCost.plus(fixedCostPerUnit);
  const netExact = fullUnitCost.div(denominator);
  const exactPrice = netExact.mul(dec(1).plus(v));
  const gross = roundPrice(exactPrice, input.roundingStepCents, input.roundingMode);

  const suggested = evaluatePrice(gross, fullUnitCost, feePercent, vatPercent);
  const compare =
    input.comparePrice && !input.comparePrice.isNegative()
      ? evaluatePrice(input.comparePrice, fullUnitCost, feePercent, vatPercent)
      : null;

  return {
    ok: true,
    fullUnitCost,
    fixedCostPerUnit,
    batchCost: fullUnitCost.mul(units),
    exactPrice,
    suggested,
    compare,
    suggestedBatchContribution: suggested.contribution.mul(units),
    compareBatchContribution: compare ? compare.contribution.mul(units) : null,
    priceDifference: compare ? compare.gross.minus(gross) : null,
  };
}

/** Margini da confrontare nella tabella "prezzi a confronto" (include il margine scelto). */
export const marginLadder = (center: number): number[] => {
  const set = new Set([20, 30, 40, 50, 60, 70].concat(Number.isFinite(center) ? [Math.round(center)] : []));
  return [...set].filter((x) => x >= 0 && x < 100).sort((a, b) => a - b);
};

export { ZERO, fromCents };
