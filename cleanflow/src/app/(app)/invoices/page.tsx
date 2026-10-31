import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { fetchInvoices } from "@/lib/server/queries";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, StatCard, Table } from "@/components/ui/misc";
import { formatter } from "@/lib/format";
import { PAYMENT_STATUS_LABELS, type InvoicePaymentStatus } from "@/lib/finance";
import { sumMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Invoices" };

const FILTERS: Array<InvoicePaymentStatus | "all" | "open"> = ["all", "open", "unpaid", "partially_paid", "overdue", "paid", "draft", "void"];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, business, today } = await requireBusiness();
  const { status = "all" } = await searchParams;
  const f = formatter(business);
  const all = await fetchInvoices(supabase, today);
  const open = (s: string) => s === "unpaid" || s === "partially_paid" || s === "overdue";
  const invoices = all.filter((i) => status === "all" || (status === "open" ? open(i.paymentStatus) : i.paymentStatus === status));
  const mine = all.filter((i) => i.currency === business.currency);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Money you have billed. Payment status updates as you record payments."
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        }
      />
      {all.length === 0 ? (
        <EmptyState icon={<Receipt />} title="No invoices yet" description="Complete a job and choose “Create invoice”, or create one manually." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding" value={f.money(sumMoney(mine.filter((i) => open(i.paymentStatus)).map((i) => i.balance)))} />
            <StatCard label="Overdue" tone="danger" value={f.money(sumMoney(mine.filter((i) => i.paymentStatus === "overdue").map((i) => i.balance)))} />
            <StatCard label="Received on invoices" value={f.money(sumMoney(mine.map((i) => i.paid)))} />
          </div>
          <form className="mb-4 flex gap-2" action="/invoices">
            <label htmlFor="status" className="sr-only">
              Payment status
            </label>
            <Select id="status" name="status" defaultValue={status} className="w-48">
              {FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All invoices" : s === "open" ? "Open (not paid)" : PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices match this filter" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/invoices/${i.id}`} className="font-medium text-forest hover:text-brand hover:underline">
                        {i.number}
                      </Link>{" "}
                      {i.is_demo && <DemoBadge />}
                    </td>
                    <td>{i.clients?.name}</td>
                    <td className="text-muted">{f.date(i.issue_date)}</td>
                    <td className="text-muted">{f.date(i.due_date)}</td>
                    <td className="text-right tabular-nums">{f.money(i.total, i.currency)}</td>
                    <td className="text-right tabular-nums">{f.money(i.balance, i.currency)}</td>
                    <td>
                      <StatusBadge status={i.paymentStatus} label={PAYMENT_STATUS_LABELS[i.paymentStatus]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </>
  );
}
