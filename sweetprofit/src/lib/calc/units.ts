import type { BaseUnit, Dimension, Unit } from "../domain/types";
import { D, dec, type Dec } from "./decimal";

const UNIT_INFO: Record<Unit, { dimension: Dimension; base: BaseUnit; factor: number }> = {
  g: { dimension: "mass", base: "g", factor: 1 },
  kg: { dimension: "mass", base: "g", factor: 1000 },
  ml: { dimension: "volume", base: "ml", factor: 1 },
  l: { dimension: "volume", base: "ml", factor: 1000 },
  pz: { dimension: "count", base: "pz", factor: 1 },
};

export const dimensionOf = (u: Unit): Dimension => UNIT_INFO[u].dimension;
export const baseUnitOf = (u: Unit): BaseUnit => UNIT_INFO[u].base;

/** Quantità espressa nell'unità base della sua stessa dimensione (kg → g, l → ml). */
export function toBase(quantity: number | Dec, unit: Unit): Dec {
  return dec(quantity).mul(UNIT_INFO[unit].factor);
}

export type ConversionError = "incompatible_units" | "density_required" | "invalid_quantity";

export type ConversionResult = { ok: true; value: Dec } | { ok: false; error: ConversionError };

/**
 * Converte una quantità tra unità.
 * Peso ↔ volume solo se è indicata la densità (g/ml); i pezzi non sono convertibili.
 */
export function convertQuantity(
  quantity: number | Dec,
  from: Unit,
  to: Unit,
  densityGPerMl: number | null = null,
): ConversionResult {
  const q = dec(quantity);
  if (q.isNaN() || q.isNegative()) return { ok: false, error: "invalid_quantity" };
  const fromDim = dimensionOf(from);
  const toDim = dimensionOf(to);
  let base = toBase(q, from);

  if (fromDim !== toDim) {
    if (fromDim === "count" || toDim === "count") return { ok: false, error: "incompatible_units" };
    if (densityGPerMl == null || !(densityGPerMl > 0)) return { ok: false, error: "density_required" };
    const density = dec(densityGPerMl);
    base = fromDim === "volume" ? base.mul(density) : base.div(density); // ml→g oppure g→ml
  }
  return { ok: true, value: base.div(UNIT_INFO[to].factor) };
}

/** Unità utilizzabili in ricetta per un ingrediente acquistato in `purchaseUnit`. */
export function compatibleUnits(purchaseUnit: Unit, densityGPerMl: number | null): Unit[] {
  const dim = dimensionOf(purchaseUnit);
  if (dim === "count") return ["pz"];
  const hasDensity = densityGPerMl != null && densityGPerMl > 0;
  if (dim === "mass") return hasDensity ? ["g", "kg", "ml", "l"] : ["g", "kg"];
  return hasDensity ? ["ml", "l", "g", "kg"] : ["ml", "l"];
}

export { D };
