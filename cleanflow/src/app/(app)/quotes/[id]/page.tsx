import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { Alert, DefinitionList, PageHeader, Table } from "@/components/ui/misc";
import { clientAddress, formatter } from "@/lib/format";
import { quoteStatusLabel, serviceTypeLabel } from "@/lib/market";
import { addDays } from "@/lib/dates";
import { checklistsForMarket, defaultChecklistFor } from "@/lib/checklists";
import { ConvertToJobDialog, DeleteQuoteButton, QuoteStatusButtons } from "./quote-actions";

export const metadata: Metadata = { title: "Quote" };

type PricingSnapshot = {
  inputs?: { hours?: number; cleaners?: number; hourlyLabourCost?: number; targetMargin?: number };
  result?: { totalCosts?: number; suggestedPrice?: number; finalPrice?: number; grossContribution?: number; actualMargin?: number };
};

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, today } = await requireBusiness();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*), clients(*), jobs(id, status, scheduled_date), quote_versions(version, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!quote) notFound();
  const f = formatter(business);
  const items = [...quote.quote_items].sort((a, b) => a.position - b.position);
  const versions = [...quote.quote_versions].sort((a, b) => b.version - a.version);
  const converted = !!quote.jobs;
  const editable = !converted && (quote.status === "draft" || quote.status === "sent");
  const pricing = quote.pricing as PricingSnapshot | null;
  const hours = (pricing?.inputs?.hours ?? 0) * 60;
  const expired = quote.valid_until && quote.valid_until < today && (quote.status === "draft" || quote.status === "sent");

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {f.terms.quote} {quote.number}
            <StatusBadge status={quote.status} label={quoteStatusLabel(quote.status)} />
            {quote.is_demo && <DemoBadge />}
          </span>
        }
        description={`Version ${quote.version} · ${serviceTypeLabel(quote.service_type, f.market)}`}
        back={{ href: "/quotes", label: f.terms.quotes }}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/api/pdf/quote/${id}`} target="_blank" rel="noopener">
                <Download /> PDF
              </a>
            </Button>
            {editable && (
              <Button asChild variant="outline">
                <Link href={`/quotes/${id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            )}
            <QuoteStatusButtons id={id} status={quote.status} converted={converted} />
            {quote.status === "accepted" && !converted && (
              <ConvertToJobDialog
                quoteId={id}
                defaultDate={addDays(today, 1)}
                defaultDuration={Math.max(60, Math.round(hours / 15) * 15 || 180)}
                checklists={checklistsForMarket(business.market).map((c) => ({ slug: c.slug, title: c.title }))}
                defaultChecklist={defaultChecklistFor(quote.service_type, business.market).slug}
              />
            )}
          </>
        }
      />

      {converted && quote.jobs && (
        <Alert tone="success" className="mb-6">
          Booked as a job on {f.date(quote.jobs.scheduled_date)}.{" "}
          <Link href={`/jobs/${quote.jobs.id}`} className="font-medium underline">
            Open the job
          </Link>
        </Alert>
      )}
      {expired && (
        <Alert tone="warning" className="mb-6">
          This {f.terms.quote.toLowerCase()} expired on {f.date(quote.valid_until)}. Edit it to set a new date before sending.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <Link href={`/clients/${quote.client_id}`} className="text-sm text-brand hover:underline">
                View client
              </Link>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  ["Name", quote.clients?.name],
                  ["Email", quote.clients?.email],
                  ["Service address", quote.clients ? clientAddress(quote.clients) : null],
                  ["Issued / valid until", `${f.date(quote.issue_date)} → ${f.date(quote.valid_until)}`],
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
                  <td className="text-right tabular-nums">{f.money(i.unit_price, quote.currency)}</td>
                  <td className="text-right tabular-nums">{f.money(i.amount, quote.currency)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="text-right font-semibold">
                  Total
                </td>
                <td className="text-right font-semibold tabular-nums" data-testid="quote-total">
                  {f.money(quote.total, quote.currency)}
                </td>
              </tr>
            </tbody>
          </Table>
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm">{quote.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {pricing?.result && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing (internal)</CardTitle>
              </CardHeader>
              <CardContent>
                <DefinitionList
                  items={[
                    ["Estimated costs", f.money(pricing.result.totalCosts, quote.currency)],
                    ["Suggested price", f.money(pricing.result.suggestedPrice, quote.currency)],
                    ["Gross contribution", f.money(pricing.result.grossContribution, quote.currency)],
                    ["Margin", `${((pricing.result.actualMargin ?? 0) * 100).toFixed(1)}%`],
                  ]}
                />
                <p className="mt-3 text-xs text-muted">From the calculator when first saved. Never shown to the client.</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-line text-sm">
              {versions.map((v) => (
                <li key={v.version} className="flex justify-between px-5 py-2.5">
                  <span>Version {v.version}</span>
                  <span className="text-muted">{f.date(v.created_at.slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          </Card>
          {!converted && <DeleteQuoteButton id={id} number={quote.number} />}
        </div>
      </div>
    </>
  );
}
