// Market localisation (US / UK). All user-facing terminology that differs
// between the two markets lives here so pages, PDFs and documents agree.

export const MARKETS = ["US", "UK"] as const;
export type Market = (typeof MARKETS)[number];

export const CURRENCIES = ["USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const SERVICE_TYPES = ["standard", "deep", "move_in_out", "end_of_tenancy", "recurring", "other"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export type PaperSize = "LETTER" | "A4";

export interface MarketConfig {
  market: Market;
  locale: "en-US" | "en-GB";
  defaultCurrency: Currency;
  defaultDateFormat: DateFormat;
  defaultTimezone: string;
  paper: PaperSize;
  terms: {
    quote: string;
    quotes: string;
    labour: string;
    cancelled: string;
    postalCode: string;
    region: string;
    check: string;
    organize: string;
  };
  /** Service types offered in this market, in display order. */
  serviceTypes: ServiceType[];
}

export const MARKET_CONFIG: Record<Market, MarketConfig> = {
  US: {
    market: "US",
    locale: "en-US",
    defaultCurrency: "USD",
    defaultDateFormat: "MM/DD/YYYY",
    defaultTimezone: "America/New_York",
    paper: "LETTER",
    terms: {
      quote: "Estimate",
      quotes: "Estimates",
      labour: "Labor",
      cancelled: "Canceled",
      postalCode: "ZIP code",
      region: "State",
      check: "Check",
      organize: "organize",
    },
    serviceTypes: ["standard", "deep", "move_in_out", "recurring", "other"],
  },
  UK: {
    market: "UK",
    locale: "en-GB",
    defaultCurrency: "GBP",
    defaultDateFormat: "DD/MM/YYYY",
    defaultTimezone: "Europe/London",
    paper: "A4",
    terms: {
      quote: "Quote",
      quotes: "Quotes",
      labour: "Labour",
      cancelled: "Cancelled",
      postalCode: "Postcode",
      region: "County",
      check: "Cheque",
      organize: "organise",
    },
    serviceTypes: ["standard", "deep", "end_of_tenancy", "recurring", "other"],
  },
};

export function marketConfig(market: Market | string | null | undefined): MarketConfig {
  return market === "UK" ? MARKET_CONFIG.UK : MARKET_CONFIG.US;
}

const SERVICE_LABELS: Record<ServiceType, Record<Market, string>> = {
  standard: { US: "Standard Cleaning", UK: "Standard Cleaning" },
  deep: { US: "Deep Cleaning", UK: "Deep Cleaning" },
  move_in_out: { US: "Move-In / Move-Out Cleaning", UK: "Move-In / Move-Out Cleaning" },
  end_of_tenancy: { US: "End of Tenancy Cleaning", UK: "End of Tenancy Cleaning" },
  recurring: { US: "Recurring Maintenance Cleaning", UK: "Regular Maintenance Cleaning" },
  other: { US: "Other Service", UK: "Other Service" },
};

export function serviceTypeLabel(type: string, market: Market | string): string {
  const m: Market = market === "UK" ? "UK" : "US";
  return SERVICE_LABELS[type as ServiceType]?.[m] ?? type;
}

/** Service types a market can select, plus the current value if it came from the other market. */
export function serviceTypeOptions(market: Market | string, current?: string | null) {
  const cfg = marketConfig(market);
  const types: string[] = [...cfg.serviceTypes];
  if (current && !types.includes(current)) types.push(current);
  return types.map((value) => ({ value, label: serviceTypeLabel(value, cfg.market) }));
}

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const JOB_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export function jobStatusLabel(status: string, market: Market | string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return marketConfig(market).terms.cancelled;
    default:
      return status;
  }
}

export function quoteStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export const PAYMENT_METHODS = ["cash", "check", "bank_transfer", "card_external", "payment_app", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function paymentMethodLabel(method: string, market: Market | string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "check":
      return marketConfig(market).terms.check;
    case "bank_transfer":
      return "Bank transfer";
    case "card_external":
      return "Card (external terminal)";
    case "payment_app":
      return "Payment app";
    default:
      return "Other";
  }
}

export const EXPENSE_CATEGORIES = [
  "supplies",
  "equipment",
  "travel",
  "vehicle",
  "insurance",
  "marketing",
  "software",
  "labour",
  "fees",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function expenseCategoryLabel(category: string, market: Market | string): string {
  const labels: Record<string, string> = {
    supplies: "Cleaning supplies",
    equipment: "Equipment",
    travel: "Travel",
    vehicle: "Vehicle & fuel",
    insurance: "Insurance",
    marketing: "Marketing",
    software: "Software",
    labour: `${marketConfig(market).terms.labour} / subcontractors`,
    fees: "Bank & platform fees",
    other: "Other",
  };
  return labels[category] ?? category;
}
