import { D, dec, type Dec } from "../calc/decimal";
import type { Unit } from "../domain/types";

/** Impostazioni regionali correnti. In futuro: "de-DE", "fr-FR". */
let currentLocale = "it-IT";
export const setFormatLocale = (l: string) => (currentLocale = l);

const toDec = (v: Dec | number) => (typeof v === "number" ? dec(v) : v);

/** Arrotonda con Decimal (half up) PRIMA di passare a Intl, così 2,505 → 2,51. */
function fmt(v: Dec | number, min: number, max: number) {
  const n = toDec(v).toDecimalPlaces(max, D.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat(currentLocale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
}

export const formatNumber = (v: Dec | number, maxDecimals = 2) => fmt(v, 0, maxDecimals);

export const formatEUR = (v: Dec | number) => `${fmt(v, 2, 2)} €`;

export const formatEURSigned = (v: Dec | number) => {
  const d = toDec(v);
  return d.isPositive() && !d.isZero() ? `+${formatEUR(d)}` : formatEUR(d);
};

export const formatPercent = (v: Dec | number | null | undefined, decimals = 1) =>
  v == null ? "—" : `${fmt(v, 0, decimals)}%`;

/** Costo per unità base con decimali adeguati: 0,0018 €/g · 0,40 €/pz. */
export function formatUnitCost(v: Dec | number, unit: string) {
  const d = toDec(v).abs();
  // sotto 0,10 € servono più decimali (0,0018 €/g); i decimali minimi evitano un ambiguo "0,01"
  const [min, max] = d.gte(0.1) ? [2, 4] : [4, 5];
  return `${fmt(v, min, max)} €/${unit}`;
}

export const formatQty = (n: number, unit: Unit | string) => `${fmt(n, 0, 3)} ${unit}`;

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }).format(d);
};

/** Numero per CSV (virgola decimale, nessun separatore delle migliaia). */
export const csvNumber = (v: Dec | number | null | undefined, decimals = 2) =>
  v == null ? "" : toDec(v).toDecimalPlaces(decimals, D.ROUND_HALF_UP).toFixed(decimals).replace(".", ",");
