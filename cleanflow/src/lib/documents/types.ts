import type { Market } from "../market";

export type DocBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; id?: string; text: string }
  | { type: "fields"; title?: string; fields: DocField[] }
  | { type: "checklist"; title: string; items: string[] }
  | { type: "table"; title?: string; columns: string[]; rows: string[][]; blankRows?: number }
  | { type: "messages"; title?: string; items: Array<{ id: string; title: string; body: string }> }
  | { type: "signature"; labels: string[] }
  | { type: "notice"; text: string };

export interface DocField {
  label: string;
  value?: string;
  /** Number of writing lines to print when no value is provided. */
  lines?: number;
}

export interface DocBusiness {
  name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_data_url: string | null;
  currency: string;
  market: Market;
  date_format: string;
  invoice_footer: string | null;
  payment_terms_days: number;
}

export interface DocClient {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service_preferences: string | null;
}

export interface DocJob {
  serviceLabel: string;
  date: string;
  time: string;
  duration: string;
  price: string;
  address: string | null;
}

export interface DocContext {
  business: DocBusiness;
  client: DocClient | null;
  job: DocJob | null;
  today: string;
}

export interface DocumentTemplate {
  slug: string;
  number: number;
  markets: Market[];
  category: "Forms" | "Sales" | "Billing" | "Checklists" | "Client communication";
  title: (market: Market) => string;
  description: string;
  /** Whether client details can be filled in from a saved client. */
  usesClient: boolean;
  /** Whether a booked job can be used to fill the document. */
  usesJob?: boolean;
  build: (ctx: DocContext) => DocBlock[];
}

/** Editable text overrides saved per business: block/message id → text. */
export type DocOverrides = Record<string, string>;
