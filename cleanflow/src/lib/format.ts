import { formatDate, formatTime } from "./dates";
import { marketConfig, type Market } from "./market";
import { formatMoney } from "./money";

export interface FormatSettings {
  market: string;
  currency: string;
  date_format: string;
}

/** Formatting helpers bound to a business's localisation settings. */
export function formatter(b: FormatSettings) {
  const market = (b.market === "UK" ? "UK" : "US") as Market;
  return {
    market,
    terms: marketConfig(market).terms,
    /** Formats an amount; uses the record's own currency when provided. */
    money: (amount: number | string | null | undefined, currency?: string) => formatMoney(amount, currency ?? b.currency, market),
    date: (iso: string | null | undefined) => formatDate(iso, b.date_format),
    time: (t: string | null | undefined) => formatTime(t, market),
  };
}

export function clientAddress(c: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
}): string {
  const cityLine = [c.city, [c.region, c.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [c.address_line1, c.address_line2, cityLine].filter(Boolean).join("\n");
}
