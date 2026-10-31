import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { DefinitionList, PageHeader, Table } from "@/components/ui/misc";
import { PaymentDialog } from "@/components/payment-dialog";
import { clientAddress, formatter } from "@/lib/format";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/market";
import { PAYMENT_STATUS_LABELS, invoiceBalance, invoicePaymentStatus } from "@/lib/finance";
import { sumMoney } from "@/lib/money";
import { DeleteInvoiceButton, DeletePaymentButton, IssueButton, VoidInvoiceButton } from "./invoice-actions";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, today } = await requireBusiness();
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), clients(*), jobs(id, scheduled_date), payments(*)")
    .eq("id", id)
    .maybeSingle();
  if (!inv) notFound();
  const f = formatter(business);
  const items = [...inv.invoice_items].sort((a, b) => a.position - b.position);
  const payments = [...inv.payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const paid = sumMoney(payments.map((p) => p.amount));
  const balance = invoiceBalance({ ...inv, paid });
  const status = invoicePaymentStatus({ ...inv, paid }, today);
  const methods = PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m, f.market) }));

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Invoice {inv.number} <StatusBadge status={status} label={PAYMENT_STATUS_LABELS[status]} />
            {inv.is_demo && <DemoBadge />}
          </span>
        }
        description={`Issued ${f.date(inv.issue_date)} · Due ${f.date(inv.due_date)}`}
        back={{ href: "/invoices", label: "Invoices" }}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/api/pdf/invoice/${id}`} target="_blank" rel="noopener">
                <Download /> PDF
              </a>
            </Button>
            {inv.status !== "void" && (
              <Button asChild variant="outline">
                <Link href={`/invoices/${id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            )}
            {inv.status === "draft" && <IssueButton id={id} />}
            {inv.status === "issued" && payments.length === 0 && <VoidInvoiceButton id={id} number={inv.number} />}
            {inv.status === "draft" && payments.length === 0 && <DeleteInvoiceButton id={id} number={inv.number} />}
            {inv.status === "issued" && balance > 0 && (
              <PaymentDialog
                today={today}
                methods={methods}
                invoices={[{ id, label: inv.number, balance, balanceLabel: f.money(balance, inv.currency) }]}
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Bill to</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  ["Client", <Link key="c" href={`/clients/${inv.client_id}`} className="text-brand hover:underline">{inv.clients?.name}</Link>],
                  ["Email", inv.clients?.email],
                  ["Address", inv.clients ? clientAddress(inv.clients) : null],
                  ["Job", inv.jobs ? <Link key="j" href={`/jobs/${inv.jobs.id}`} className="text-brand hover:underline">{f.date(inv.jobs.scheduled_date)}</Link> : "Not linked to a job"],
                ]}
              />
            </CardContent>
          </Card>
          <Table className="[&_table]:min-w-0">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.description}</td>
                  <td className="text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="text-right tabular-nums">{f.money(i.unit_price, inv.currency)}</td>
                  <td className="text-right tabular-nums">{f.money(i.amount, inv.currency)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="text-right font-semibold">
                  Total
                </td>
                <td className="text-right font-semibold tabular-nums">{f.money(inv.total, inv.currency)}</td>
              </tr>
            </tbody>
          </Table>
          {inv.notes && (
            <Card>
              <CardContent className="whitespace-pre-line py-4 text-sm">{inv.notes}</CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total</dt>
                <dd className="tabular-nums">{f.money(inv.total, inv.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Received</dt>
                <dd className="tabular-nums" data-testid="invoice-paid">
                  {f.money(paid, inv.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                <dt>Balance</dt>
                <dd className="tabular-nums" data-testid="invoice-balance">
                  {f.money(balance, inv.currency)}
                </dd>
              </div>
            </dl>
            {payments.length === 0 ? (
              <p className="text-sm text-muted">{inv.status === "draft" ? "Issue the invoice to record payments." : "No payments recorded yet."}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {f.date(p.paid_on)}
                      <span className="block text-xs text-muted">
                        {paymentMethodLabel(p.method, f.market)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium tabular-nums">{f.money(p.amount, p.currency)}</span>
                      <DeletePaymentButton id={p.id} label={f.money(p.amount, p.currency)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
