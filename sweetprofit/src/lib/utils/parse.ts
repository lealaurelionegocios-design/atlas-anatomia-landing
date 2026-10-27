import { D, dec } from "../calc/decimal";

/**
 * Interpreta numeri scritti all'italiana o all'inglese: "1,80", "1.80", "1.234,5".
 * Restituisce null se il testo non è un numero valido.
 */
export function parseLocaleNumber(input: string): number | null {
  let s = input.trim().replace(/\s|€|%/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d*\.?\d+$/.test(s) && !/^-?\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Euro (testo) → centesimi interi, arrotondati half up. */
export function parseEuroToCents(input: string): number | null {
  const n = parseLocaleNumber(input);
  if (n == null) return null;
  return dec(n).mul(100).toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();
}

/** Centesimi → testo per un campo di input ("1,80"). */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");

export const numberToInput = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "" : String(n).replace(".", ",");
