import DecimalBase from "decimal.js";

/**
 * Istanza Decimal dedicata (non modifica la configurazione globale).
 * Precisione di 40 cifre significative: nessun arrotondamento intermedio.
 * Gli arrotondamenti avvengono solo in output, sempre "half up" (0,005 → 0,01).
 */
export const D = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;

export const ZERO = new D(0);
export const HUNDRED = new D(100);

/** Converte un numero JS in Decimal passando dalla stringa (evita 0.1+0.2). */
export function dec(value: number | string | Dec): Dec {
  if (value instanceof D) return value;
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Valore non finito");
  return new D(String(value));
}

export const fromCents = (cents: number): Dec => dec(cents).div(100);

/** Arrotonda un importo in euro al centesimo (half up) e restituisce i centesimi interi. */
export const toCents = (euro: Dec): number => euro.mul(100).toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();

/** Arrotonda a 2 decimali (half up) per la visualizzazione. */
export const roundMoney = (euro: Dec): Dec => euro.toDecimalPlaces(2, D.ROUND_HALF_UP);

export const pctToRatio = (pct: number | Dec): Dec => dec(pct).div(HUNDRED);

export const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
