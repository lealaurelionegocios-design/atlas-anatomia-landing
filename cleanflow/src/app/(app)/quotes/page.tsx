import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, FileText, Plus } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { formatter } from "@/lib/format";
import { QUOTE_STATUSES, quoteStatusLabel, serviceTypeLabel } from "@/lib/market";

export const metadata: Metadata = { title: "Quotes & Estimates" };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, business } = await requireBusiness();
  const { status = "all" } = await searchParams;
  const f = formatter(business);

  let query = supabase
    .from("quotes")
    .select("id, number, status, total, currency, issue_date, valid_until, service_type, version, is_demo, clients(name), jobs(id)")
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false })
    .limit(500);
  if ((QUOTE_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data: quotes } = await query;
  const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true });

  return (
    <>
      <PageHeader
        title={f.terms.quotes}
        description={`Create, send and track ${f.terms.quotes.toLowerCase()}. Accepted ones can be booked as jobs.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/pricing">
                <Calculator /> Pricing calculator
              </Link>
            </Button>
            <Button asChild>
              <Link href="/quotes/new">
                <Plus /> New {f.terms.quote.toLowerCase()}
              </Link>
            </Button>
          </>
        }
      />
      {count === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={`No ${f.terms.quotes.toLowerCase()} yet`}
          description="Use the pricing calculator to work out a fair price from your costs, then save it for a client."
          action={
            <Button asChild>
              <Link href="/pricing">
                <Calculator /> Open the pricing calculator
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <form className="mb-4 flex gap-2" action="/quotes">
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <Select id="status" name="status" defaultValue={status} className="w-44">
              <option value="all">All statuses</option>
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {quoteStatusLabel(s)}
                </option>
              ))}
            </Select>
            <Button variant="outline" type="submit">
              Filter
            </Button>
          </form>
          {quotes && quotes.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Issued</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <Link href={`/quotes/${q.id}`} className="font-medium text-forest hover:text-brand hover:underline">
                        {q.number}
                      </Link>
                      {q.version > 1 && <span className="ml-1 text-xs text-muted">v{q.version}</span>} {q.is_demo && <DemoBadge />}
                    </td>
                    <td>{q.clients?.name}</td>
                    <td className="text-muted">{serviceTypeLabel(q.service_type, f.market)}</td>
                    <td className="text-muted">{f.date(q.issue_date)}</td>
                    <td className="text-right tabular-nums">{f.money(q.total, q.currency)}</td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        <StatusBadge status={q.status} label={quoteStatusLabel(q.status)} />
                        {q.jobs && <StatusBadge status="completed" label="Booked" />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="Nothing matches this filter" />
          )}
        </>
      )}
    </>
  );
}
