import type { Metadata } from "next";
import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { fetchInvoices } from "@/lib/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { Alert, EmptyState, PageHeader, StatCard, Table } from "@/components/ui/misc";
import { PeriodFilter, parsePeriod } from "@/components/period-filter";
import { MoneyChart } from "@/components/money-chart";
import { PaymentDialog } from "@/components/payment-dialog";
import { formatter } from "@/lib/format";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, expenseCategoryLabel, paymentMethodLabel } from "@/lib/market";
import { monthLabel, periodRange } from "@/lib/dates";
import { computeDashboard } from "@/lib/finance";
import { currencySymbol } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DeleteExpenseButton, ExpenseDialog } from "./expense-dialog";
import { DeletePaymentButton } from "../invoices/[id]/invoice-actions";

export const metadata: Metadata = { title: "Payments & Expenses" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const { supabase, business, today } = await requireBusiness();
  const sp = await searchParams;
  const tab = sp.tab === "expenses" ? "expenses" : "payments";
  const period = parsePeriod(sp.period, "this_month");
  const range = periodRange(period, today, { from: sp.from, to: sp.to });
  const f = formatter(business);

  let pq = supabase.from("payments").select("id, amount, currency, paid_on, method, reference, is_demo, invoice_id, invoices(number), clients(name)").order("paid_on", { ascending: false }).limit(2000);
  let eq = supabase.from("expenses").select("id, amount, currency, spent_on, category, description, is_demo").order("spent_on", { ascending: false }).limit(2000);
  if (range.from) {
    pq = pq.gte("paid_on", range.from);
    eq = eq.gte("spent_on", range.from);
  }
  if (range.to) {
    pq = pq.lte("paid_on", range.to);
    eq = eq.lte("spent_on", range.to);
  }
  const [{ data: payments }, { data: expenses }, invoices] = await Promise.all([pq, eq, fetchInvoices(supabase, today)]);

  const metrics = computeDashboard({
    currency: business.currency,
    today,
    range,
    clients: [],
    jobs: [],
    quotes: [],
    invoices,
    payments: payments ?? [],
    expenses: expenses ?? [],
  });
  const payable = invoices
    .filter((i) => i.status === "issued" && i.balance > 0)
    .map((i) => ({ id: i.id, label: `${i.number} · ${i.clients?.name ?? ""}`, balance: i.balance, balanceLabel: f.money(i.balance, i.currency) }));
  const exportQuery = new URLSearchParams({ ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) }).toString();
  const tabHref = (t: string) => `/payments?${new URLSearchParams({ tab: t, period, ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Payments & Expenses"
        description="Money actually received and business costs. CleanFlow does not process card payments."
        actions={
          <>
            <ExpenseDialog
              today={today}
              currencySymbol={currencySymbol(business.currency)}
              categories={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: expenseCategoryLabel(c, f.market) }))}
            />
            <PaymentDialog today={today} invoices={payable} methods={PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m, f.market) }))} />
          </>
        }
      />

      <div className="mb-6">
        <PeriodFilter action="/payments" period={period} from={sp.from} to={sp.to} hidden={{ tab }} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Received" value={f.money(metrics.revenueReceived)} />
        <StatCard label="Expenses" value={f.money(metrics.expenses)} />
        <StatCard label="Est. net operating surplus" value={f.money(metrics.estimatedNetOperatingSurplus)} hint="Received − recorded expenses. Not accounting profit." />
        <StatCard label="Outstanding now" value={f.money(metrics.outstandingPayments)} hint={`${metrics.overdueInvoices} overdue`} tone={metrics.overdueInvoices ? "danger" : "default"} />
      </div>
      {metrics.otherCurrencyRecords > 0 && (
        <Alert tone="warning" className="mb-6">
          {metrics.otherCurrencyRecords} record(s) in another currency are listed but excluded from these totals.
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Operational cash flow</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyChart currency={business.currency} market={business.market} data={metrics.monthly.map((m) => ({ label: monthLabel(m.month, f.market), received: m.received, expenses: m.expenses }))} />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="tablist" aria-label="Records">
          {(["payments", "expenses"] as const).map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              role="tab"
              aria-selected={tab === t}
              className={cn("rounded-md px-4 py-1.5 text-sm capitalize", tab === t ? "bg-mint font-medium text-forest" : "text-muted")}
            >
              {t === "payments" ? `Payments (${payments?.length ?? 0})` : `Expenses (${expenses?.length ?? 0})`}
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/${tab}?${exportQuery}`}>
            <Download /> Export CSV
          </a>
        </Button>
      </div>

      {tab === "payments" ? (
        payments && payments.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Invoice</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {f.date(p.paid_on)} {p.is_demo && <DemoBadge />}
                  </td>
                  <td>{p.clients?.name ?? "—"}</td>
                  <td>
                    {p.invoice_id ? (
                      <Link href={`/invoices/${p.invoice_id}`} className="text-brand hover:underline">
                        {p.invoices?.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-muted">
                    {paymentMethodLabel(p.method, f.market)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </td>
                  <td className="text-right font-medium tabular-nums">{f.money(p.amount, p.currency)}</td>
                  <td className="text-right">
                    <DeletePaymentButton id={p.id} label={f.money(p.amount, p.currency)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<Wallet />} title="No payments in this period" description="Record a payment when a client pays an invoice." />
        )
      ) : expenses && expenses.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>
                  {f.date(e.spent_on)} {e.is_demo && <DemoBadge />}
                </td>
                <td>{e.description}</td>
                <td className="text-muted">{expenseCategoryLabel(e.category, f.market)}</td>
                <td className="text-right font-medium tabular-nums">{f.money(e.amount, e.currency)}</td>
                <td className="text-right">
                  <DeleteExpenseButton id={e.id} label={e.description} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState icon={<Wallet />} title="No expenses in this period" description="Add supplies, travel and other costs to see your estimated surplus." />
      )}
    </>
  );
}
