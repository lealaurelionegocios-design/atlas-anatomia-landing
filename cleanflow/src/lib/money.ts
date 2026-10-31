import { marketConfig, type Currency, type Market } from "./market";

// Money is handled as integer minor units (cents/pence) in calculations and
// stored as numeric(12,2) in the database. Never add floats directly.

/** Converts a decimal amount (number or numeric string) to integer cents, rounding half away from zero. */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new RangeError(`Invalid amount: ${value}`);
  // Use the string form to avoid binary artefacts like 1.005 * 100 = 100.49999.
  const [intPart, fracPart = ""] = Math.abs(n).toFixed(10).split(".");
  const cents = Number(intPart) * 100 + Number(fracPart.slice(0, 2));
  const roundUp = Number(fracPart[2] ?? "0") >= 5 ? 1 : 0;
  const result = cents + roundUp;
  return n < 0 ? -result : result;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Rounds a decimal amount to 2 places using the same rule as toCents. */
export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}

/** Sum of decimal amounts, computed in cents. */
export function sumMoney(values: Array<number | string | null | undefined>): number {
  return fromCents(values.reduce<number>((acc, v) => acc + toCents(v), 0));
}

/** Line amount = quantity × unit price, rounded to cents (mirrors the DB generated column). */
export function lineAmount(quantity: number | string, unitPrice: number | string): number {
  return roundMoney(Number(quantity) * Number(unitPrice));
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency: Currency | string,
  market?: Market | string,
): string {
  const n = amount === null || amount === undefined || amount === "" ? 0 : Number(amount);
  const locale = market ? marketConfig(market).locale : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency === "GBP" ? "GBP" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function currencySymbol(currency: Currency | string): string {
  return currency === "GBP" ? "£" : "$";
}
