import { addMonths, inRange, monthKey, monthsBetween, startOfMonth, type DateRange } from "./dates";
import { fromCents, toCents } from "./money";

// Financial vocabulary used across the app — these are deliberately different
// numbers and are never mixed:
//   Quoted value    → accepted quotes/estimates (a promise, not income)
//   Invoiced        → invoices issued (money billed)
//   Received        → payments actually recorded
//   Outstanding     → issued invoices minus payments received
//   Est. net operating surplus → received − recorded expenses. This is an
//   operational estimate, NOT accounting profit (no tax, depreciation,
//   accruals or unrecorded costs).

export type InvoicePaymentStatus = "draft" | "void" | "unpaid" | "partially_paid" | "paid" | "overdue";

export const PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  draft: "Draft",
  void: "Void",
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
};

export interface InvoiceLike {
  status: string;
  total: number | string;
  due_date: string;
  paid?: number | string;
}

export function invoiceBalance(inv: InvoiceLike): number {
  return fromCents(Math.max(0, toCents(inv.total) - toCents(inv.paid ?? 0)));
}

export function invoicePaymentStatus(inv: InvoiceLike, today: string): InvoicePaymentStatus {
  if (inv.status === "void") return "void";
  if (inv.status === "draft") return "draft";
  const total = toCents(inv.total);
  const paid = toCents(inv.paid ?? 0);
  if (paid >= total) return "paid";
  if (inv.due_date < today) return "overdue";
  return paid > 0 ? "partially_paid" : "unpaid";
}

export interface DashboardInput {
  currency: string;
  today: string;
  range: DateRange;
  clients: Array<{ archived_at: string | null }>;
  jobs: Array<{ status: string; scheduled_date: string; price: number | string; currency: string }>;
  quotes: Array<{ status: string; total: number | string; currency: string; accepted_at: string | null; issue_date: string }>;
  invoices: Array<InvoiceLike & { currency: string; issue_date: string }>;
  payments: Array<{ amount: number | string; currency: string; paid_on: string }>;
  expenses: Array<{ amount: number | string; currency: string; spent_on: string }>;
}

export interface MonthlyPoint {
  month: string;
  received: number;
  expenses: number;
  surplus: number;
}

export interface DashboardMetrics {
  totalClients: number;
  upcomingJobs: number;
  completedJobs: number;
  revenueReceived: number;
  outstandingPayments: number;
  overdueAmount: number;
  overdueInvoices: number;
  expenses: number;
  estimatedNetOperatingSurplus: number;
  invoicedInPeriod: number;
  acceptedQuoteValue: number;
  monthly: MonthlyPoint[];
  /** Records stored in a currency other than the business currency (excluded from totals). */
  otherCurrencyRecords: number;
}

export function computeDashboard(input: DashboardInput): DashboardMetrics {
  const { currency, today, range } = input;
  let otherCurrency = 0;
  const same = <T extends { currency: string }>(rows: T[]) =>
    rows.filter((r) => {
      if (r.currency === currency) return true;
      otherCurrency += 1;
      return false;
    });

  const jobs = same(input.jobs);
  const quotes = same(input.quotes);
  const invoices = same(input.invoices);
  const payments = same(input.payments);
  const expenses = same(input.expenses);

  const receivedC = payments.filter((p) => inRange(p.paid_on, range)).reduce((a, p) => a + toCents(p.amount), 0);
  const expensesC = expenses.filter((e) => inRange(e.spent_on, range)).reduce((a, e) => a + toCents(e.amount), 0);

  let outstandingC = 0;
  let overdueC = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    const status = invoicePaymentStatus(inv, today);
    if (status === "draft" || status === "void" || status === "paid") continue;
    const bal = toCents(invoiceBalance(inv));
    outstandingC += bal;
    if (status === "overdue") {
      overdueC += bal;
      overdueCount += 1;
    }
  }

  const invoicedC = invoices
    .filter((i) => i.status === "issued" && inRange(i.issue_date, range))
    .reduce((a, i) => a + toCents(i.total), 0);
  const acceptedC = quotes
    .filter((q) => q.status === "accepted" && inRange((q.accepted_at ?? q.issue_date).slice(0, 10), range))
    .reduce((a, q) => a + toCents(q.total), 0);

  // Monthly series: the selected range, or the last 6 months for open ranges.
  const to = range.to ?? today;
  const from = range.from ?? startOfMonth(addMonths(to, -5));
  const months = monthsBetween(from, to, 12);
  const monthly: MonthlyPoint[] = months.map((m) => {
    const r = payments.filter((p) => monthKey(p.paid_on) === m && inRange(p.paid_on, range)).reduce((a, p) => a + toCents(p.amount), 0);
    const e = expenses.filter((x) => monthKey(x.spent_on) === m && inRange(x.spent_on, range)).reduce((a, x) => a + toCents(x.amount), 0);
    return { month: m, received: fromCents(r), expenses: fromCents(e), surplus: fromCents(r - e) };
  });

  return {
    totalClients: input.clients.filter((c) => !c.archived_at).length,
    upcomingJobs: jobs.filter((j) => (j.status === "scheduled" || j.status === "in_progress") && j.scheduled_date >= today).length,
    completedJobs: jobs.filter((j) => j.status === "completed" && inRange(j.scheduled_date, range)).length,
    revenueReceived: fromCents(receivedC),
    outstandingPayments: fromCents(outstandingC),
    overdueAmount: fromCents(overdueC),
    overdueInvoices: overdueCount,
    expenses: fromCents(expensesC),
    estimatedNetOperatingSurplus: fromCents(receivedC - expensesC),
    invoicedInPeriod: fromCents(invoicedC),
    acceptedQuoteValue: fromCents(acceptedC),
    monthly,
    otherCurrencyRecords: otherCurrency,
  };
}
