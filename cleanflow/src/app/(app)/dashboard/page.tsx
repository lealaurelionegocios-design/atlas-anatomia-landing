import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  CheckCircle2,
  HandCoins,
  PiggyBank,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { fetchInvoices } from "@/lib/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Alert, PageHeader, StatCard } from "@/components/ui/misc";
import { PeriodFilter, parsePeriod } from "@/components/period-filter";
import { MoneyChart } from "@/components/money-chart";
import { DemoDataButton } from "@/components/demo-data-button";
import { formatter } from "@/lib/format";
import { PERIOD_LABELS, monthLabel, periodRange } from "@/lib/dates";
import { PAYMENT_STATUS_LABELS, computeDashboard } from "@/lib/finance";
import { jobStatusLabel, serviceTypeLabel } from "@/lib/market";

export const metadata: Metadata = { title: "Business Overview" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const { supabase, business, today } = await requireBusiness();
  const sp = await searchParams;
  const period = parsePeriod(sp.period, "this_month");
  const range = periodRange(period, today, { from: sp.from, to: sp.to });
  const f = formatter(business);

  const [{ data: clients }, { data: jobs }, { data: quotes }, invoices, { data: payments }, { data: expenses }] = await Promise.all([
    supabase.from("clients").select("archived_at, is_demo").limit(5000),
    supabase.from("jobs").select("id, status, scheduled_date, start_time, price, currency, service_type, clients(name)").order("scheduled_date").order("start_time").limit(5000),
    supabase.from("quotes").select("status, total, currency, accepted_at, issue_date").limit(5000),
    fetchInvoices(supabase, today),
    supabase.from("payments").select("amount, currency, paid_on").limit(10000),
    supabase.from("expenses").select("amount, currency, spent_on").limit(10000),
  ]);

  const m = computeDashboard({
    currency: business.currency,
    today,
    range,
    clients: clients ?? [],
    jobs: jobs ?? [],
    quotes: quotes ?? [],
    invoices,
    payments: payments ?? [],
    expenses: expenses ?? [],
  });

  const upcoming = (jobs ?? []).filter((j) => (j.status === "scheduled" || j.status === "in_progress") && j.scheduled_date >= today).slice(0, 6);
  const pending = invoices
    .filter((i) => i.paymentStatus === "overdue" || i.paymentStatus === "unpaid" || i.paymentStatus === "partially_paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 6);
  const completedToInvoice = (jobs ?? []).filter((j) => j.status === "completed" && !invoices.some((i) => i.job_id === j.id)).length;
  const isEmpty = (clients ?? []).length === 0;
  const hasDemo = (clients ?? []).some((c) => c.is_demo);
  const periodLabel = period === "custom" ? `${f.date(range.from)} – ${f.date(range.to)}` : PERIOD_LABELS[period];

  return (
    <>
      <PageHeader title="Business Overview" description={`${business.name} · ${periodLabel}`} actions={<PeriodFilter action="/dashboard" period={period} from={sp.from} to={sp.to} />} />

      {isEmpty && (
        <Card className="mb-6 border-mint-strong bg-mint/40">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Let&apos;s get your first job in</h2>
              <p className="text-sm text-muted">Add a client, price the job, then book it. Or explore with sample data first — you can remove it in one click.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DemoDataButton mode="load" />
              <Button asChild>
                <Link href="/clients/new">
                  <UserPlus /> Add first client
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {hasDemo && (
        <Alert tone="warning" className="mb-6">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>You are viewing sample (demo) records alongside your own. They are marked “Demo”.</span>
            <DemoDataButton mode="remove" />
          </span>
        </Alert>
      )}
      {m.otherCurrencyRecords > 0 && (
        <Alert tone="warning" className="mb-6">
          {m.otherCurrencyRecords} record(s) are in a currency other than {business.currency} and are excluded from these totals. Amounts are never converted automatically.
        </Alert>
      )}

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clients" value={m.totalClients} icon={<Users />} hint="Active (not archived)" />
        <StatCard label="Upcoming jobs" value={m.upcomingJobs} icon={<CalendarDays />} hint="Scheduled from today" />
        <StatCard label="Completed jobs" value={m.completedJobs} icon={<CheckCircle2 />} hint={periodLabel} />
        <StatCard label="Revenue received" value={<span data-testid="metric-received">{f.money(m.revenueReceived)}</span>} icon={<HandCoins />} hint={`Payments recorded · ${periodLabel}`} />
        <StatCard
          label="Outstanding payments"
          value={<span data-testid="metric-outstanding">{f.money(m.outstandingPayments)}</span>}
          icon={<Receipt />}
          tone={m.overdueInvoices > 0 ? "danger" : "default"}
          hint={m.overdueInvoices > 0 ? `${f.money(m.overdueAmount)} overdue on ${m.overdueInvoices} invoice(s)` : "Issued invoices not yet paid"}
        />
        <StatCard label="Expenses" value={f.money(m.expenses)} icon={<Wallet />} hint={periodLabel} />
        <StatCard
          label="Est. net operating surplus"
          value={<span data-testid="metric-surplus">{f.money(m.estimatedNetOperatingSurplus)}</span>}
          icon={<PiggyBank />}
          tone={m.estimatedNetOperatingSurplus < 0 ? "warning" : "default"}
          hint="Received − recorded expenses. An estimate, not accounting profit."
        />
        <StatCard label={`Accepted ${f.terms.quotes.toLowerCase()}`} value={f.money(m.acceptedQuoteValue)} icon={<TrendingUp />} hint={`Work won · invoiced ${f.money(m.invoicedInPeriod)}`} />
      </section>

      <section aria-label="Shortcuts" className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/clients/new">
            <UserPlus /> Add client
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/pricing">
            <Calculator /> Price a job
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/jobs/new">
            <CalendarDays /> Book job
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/payments">
            <HandCoins /> Record payment
          </Link>
        </Button>
      </section>

      {completedToInvoice > 0 && (
        <Alert tone="info" className="mt-6">
          <AlertTriangle className="mr-1 inline size-4" /> {completedToInvoice} completed job(s) have not been invoiced yet.{" "}
          <Link href="/jobs?view=list&when=all&status=completed" className="font-medium underline">
            Review jobs
          </Link>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming jobs</CardTitle>
            <Link href="/jobs?view=calendar" className="text-sm text-brand hover:underline">
              Calendar
            </Link>
          </CardHeader>
          {upcoming.length === 0 ? (
            <CardContent className="text-sm text-muted">Nothing scheduled.</CardContent>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {upcoming.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                    <span className="min-w-0">
                      <span className="block font-medium text-forest">
                        {f.date(j.scheduled_date)} · {f.time(j.start_time)}
                      </span>
                      <span className="block truncate text-muted">
                        {j.clients?.name} · {serviceTypeLabel(j.service_type, f.market)}
                      </span>
                    </span>
                    <StatusBadge status={j.status} label={jobStatusLabel(j.status, f.market)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending payments</CardTitle>
            <Link href="/invoices?status=open" className="text-sm text-brand hover:underline">
              All invoices
            </Link>
          </CardHeader>
          {pending.length === 0 ? (
            <CardContent className="text-sm text-muted">No money owed right now.</CardContent>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {pending.map((i) => (
                <li key={i.id}>
                  <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                    <span className="min-w-0">
                      <span className="block font-medium text-forest">
                        {i.number} · {i.clients?.name}
                      </span>
                      <span className="text-muted">Due {f.date(i.due_date)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">{f.money(i.balance, i.currency)}</span>
                      <StatusBadge status={i.paymentStatus} label={PAYMENT_STATUS_LABELS[i.paymentStatus]} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Received vs expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyChart currency={business.currency} market={business.market} data={m.monthly.map((p) => ({ label: monthLabel(p.month, f.market), received: p.received, expenses: p.expenses }))} />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted">
        Quoted, invoiced, received and surplus are different numbers. The surplus estimate ignores taxes, depreciation, unrecorded costs and timing differences — speak to an accountant
        for your actual profit.
      </p>
    </>
  );
}
