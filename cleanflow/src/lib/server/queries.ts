import "server-only";
import type { ServerSupabase } from "../supabase/server";
import { invoiceBalance, invoicePaymentStatus, type InvoicePaymentStatus } from "../finance";
import { sumMoney } from "../money";

export const INVOICE_SELECT = "id, number, status, issue_date, due_date, total, currency, client_id, job_id, is_demo, clients(name), payments(amount)";

type RawInvoice = {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  due_date: string;
  total: number;
  currency: string;
  client_id: string;
  job_id: string | null;
  is_demo: boolean;
  clients: { name: string } | null;
  payments: { amount: number }[];
};

export type InvoiceRow = Omit<RawInvoice, "payments"> & {
  paid: number;
  balance: number;
  paymentStatus: InvoicePaymentStatus;
};

export function withPaymentStatus(rows: RawInvoice[], today: string): InvoiceRow[] {
  return rows.map(({ payments, ...inv }) => {
    const paid = sumMoney(payments.map((p) => p.amount));
    return { ...inv, paid, balance: invoiceBalance({ ...inv, paid }), paymentStatus: invoicePaymentStatus({ ...inv, paid }, today) };
  });
}

export async function fetchInvoices(
  supabase: ServerSupabase,
  today: string,
  filter?: { clientId?: string; from?: string | null; to?: string | null },
): Promise<InvoiceRow[]> {
  let q = supabase.from("invoices").select(INVOICE_SELECT).order("issue_date", { ascending: false }).order("number", { ascending: false }).limit(1000);
  if (filter?.clientId) q = q.eq("client_id", filter.clientId);
  if (filter?.from) q = q.gte("issue_date", filter.from);
  if (filter?.to) q = q.lte("issue_date", filter.to);
  const { data } = await q;
  return withPaymentStatus((data ?? []) as unknown as RawInvoice[], today);
}

export async function fetchClientOptions(supabase: ServerSupabase, includeId?: string | null) {
  const { data } = await supabase.from("clients").select("id, name, archived_at").order("name").limit(1000);
  return (data ?? []).filter((c) => !c.archived_at || c.id === includeId).map((c) => ({ id: c.id, name: c.name }));
}
