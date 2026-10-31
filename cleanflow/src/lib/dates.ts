import type { DateFormat, Market } from "./market";

// Dates are stored as ISO calendar dates (YYYY-MM-DD) and times as HH:MM[:SS]
// in the business's own timezone. Formatting is applied only at the edges.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function formatDate(iso: string | null | undefined, format: DateFormat | string): string {
  if (!iso) return "—";
  const m = ISO_DATE.exec(iso.slice(0, 10));
  if (!m) return iso;
  const [, y, mo, d] = m;
  switch (format) {
    case "DD/MM/YYYY":
      return `${d}/${mo}/${y}`;
    case "YYYY-MM-DD":
      return `${y}-${mo}-${d}`;
    default:
      return `${mo}/${d}/${y}`;
  }
}

/** Long, human date such as "Tuesday, March 4, 2026" / "Tuesday 4 March 2026". */
export function formatDateLong(iso: string, market: Market | string): string {
  const m = ISO_DATE.exec(iso.slice(0, 10));
  if (!m) return iso;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(market === "UK" ? "en-GB" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTime(time: string | null | undefined, market: Market | string): string {
  if (!time) return "—";
  const [h, mi] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return time;
  if (market === "UK") return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mi).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Today's calendar date in an IANA timezone, as YYYY-MM-DD. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function parts(iso: string): [number, number, number] {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new RangeError(`Invalid ISO date: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return toIso(target);
}

export function startOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return toIso(new Date(Date.UTC(y, m - 1, 1)));
}

export function endOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return toIso(new Date(Date.UTC(y, m, 0)));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, market: Market | string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(market === "UK" ? "en-GB" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Day of week, 0 = Sunday. */
export function dayOfWeek(iso: string): number {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const PERIODS = ["this_month", "last_30_days", "this_quarter", "year_to_date", "last_12_months", "all_time", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This month",
  last_30_days: "Last 30 days",
  this_quarter: "This quarter",
  year_to_date: "Year to date",
  last_12_months: "Last 12 months",
  all_time: "All time",
  custom: "Custom range",
};

export interface DateRange {
  from: string | null;
  to: string | null;
}

export function periodRange(period: Period, today: string, custom?: { from?: string; to?: string }): DateRange {
  const [y, m] = parts(today);
  switch (period) {
    case "this_month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last_30_days":
      return { from: addDays(today, -29), to: today };
    case "this_quarter": {
      const qStartMonth = Math.floor((m - 1) / 3) * 3;
      const from = toIso(new Date(Date.UTC(y, qStartMonth, 1)));
      const to = toIso(new Date(Date.UTC(y, qStartMonth + 3, 0)));
      return { from, to };
    }
    case "year_to_date":
      return { from: `${y}-01-01`, to: today };
    case "last_12_months":
      return { from: startOfMonth(addMonths(today, -11)), to: endOfMonth(today) };
    case "custom": {
      const from = custom?.from && isIsoDate(custom.from) ? custom.from : null;
      const to = custom?.to && isIsoDate(custom.to) ? custom.to : null;
      if (from && to && from > to) return { from: to, to: from };
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export function inRange(iso: string | null | undefined, range: DateRange): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

/** Month keys (YYYY-MM) covering a range, capped to `max` most recent months. */
export function monthsBetween(from: string, to: string, max = 24): string[] {
  const keys: string[] = [];
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  while (cursor <= end) {
    keys.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }
  return keys.slice(-max);
}

/** "October 2026" style heading for a month. */
export function monthTitle(iso: string, market: Market | string): string {
  const [y, m] = parts(iso.slice(0, 10));
  return new Intl.DateTimeFormat(market === "UK" ? "en-GB" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
