import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, CalendarDays, Pencil } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { fetchInvoices } from "@/lib/server/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, DemoBadge, StatusBadge } from "@/components/ui/badge";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { clientAddress, formatter } from "@/lib/format";
import { jobStatusLabel, paymentMethodLabel, quoteStatusLabel, serviceTypeLabel } from "@/lib/market";
import { PAYMENT_STATUS_LABELS } from "@/lib/finance";
import { ClientDangerActions } from "./client-actions";

export const metadata: Metadata = { title: "Client" };

function History({ title, empty, children, count }: { title: string; empty: string; count: number; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="font-normal text-muted">({count})</span>
        </CardTitle>
      </CardHeader>
      {count === 0 ? <CardContent className="text-sm text-muted">{empty}</CardContent> : <ul className="divide-y divide-line text-sm">{children}</ul>}
    </Card>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, today } = await requireBusiness();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();
  const f = formatter(business);

  const [{ data: quotes }, { data: jobs }, invoices, { data: payments }] = await Promise.all([
    supabase.from("quotes").select("id, number, status, total, currency, issue_date, service_type").eq("client_id", id).order("issue_date", { ascending: false }),
    supabase.from("jobs").select("id, scheduled_date, start_time, status, price, currency, service_type").eq("client_id", id).order("scheduled_date", { ascending: false }),
    fetchInvoices(supabase, today, { clientId: id }),
    supabase.from("payments").select("id, amount, currency, paid_on, method, invoices(number)").eq("client_id", id).order("paid_on", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {client.name} {client.is_demo && <DemoBadge />} {client.archived_at && <Badge>Archived</Badge>}
          </span>
        }
        back={{ href: "/clients", label: "Clients" }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/clients/${id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/jobs/new?clientId=${id}`}>
                <CalendarDays /> Book job
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/pricing?clientId=${id}`}>
                <Calculator /> New {f.terms.quote.toLowerCase()}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList
              items={[
                ["Email", client.email ? <a className="text-brand hover:underline" href={`mailto:${client.email}`}>{client.email}</a> : null],
                ["Phone", client.phone ? <a className="text-brand hover:underline" href={`tel:${client.phone}`}>{client.phone}</a> : null],
                ["Service address", clientAddress(client)],
                ["Client since", f.date(client.created_at.slice(0, 10))],
                ["Service preferences", client.service_preferences],
                ["Notes", client.notes],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList
              items={[
                ["Jobs completed", String((jobs ?? []).filter((j) => j.status === "completed").length)],
                ["Received", f.money((payments ?? []).filter((p) => p.currency === business.currency).reduce((a, p) => a + Number(p.amount), 0))],
                ["Outstanding", f.money(invoices.filter((i) => i.currency === business.currency).reduce((a, i) => a + i.balance, 0))],
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <History title={f.terms.quotes} count={quotes?.length ?? 0} empty={`No ${f.terms.quotes.toLowerCase()} yet.`}>
          {(quotes ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/quotes/${q.id}`} className="min-w-0 hover:underline">
                <span className="font-medium text-forest">{q.number}</span>{" "}
                <span className="text-muted">· {serviceTypeLabel(q.service_type, f.market)} · {f.date(q.issue_date)}</span>
              </Link>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">{f.money(q.total, q.currency)}</span>
                <StatusBadge status={q.status} label={quoteStatusLabel(q.status)} />
              </span>
            </li>
          ))}
        </History>

        <History title="Service history" count={jobs?.length ?? 0} empty="No jobs booked yet.">
          {(jobs ?? []).map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/jobs/${j.id}`} className="min-w-0 hover:underline">
                <span className="font-medium text-forest">{f.date(j.scheduled_date)}</span>{" "}
                <span className="text-muted">· {f.time(j.start_time)} · {serviceTypeLabel(j.service_type, f.market)}</span>
              </Link>
              <StatusBadge status={j.status} label={jobStatusLabel(j.status, f.market)} />
            </li>
          ))}
        </History>

        <History title="Invoices" count={invoices.length} empty="No invoices yet.">
          {invoices.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/invoices/${i.id}`} className="hover:underline">
                <span className="font-medium text-forest">{i.number}</span> <span className="text-muted">· {f.date(i.issue_date)}</span>
              </Link>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{f.money(i.total, i.currency)}</span>
                <StatusBadge status={i.paymentStatus} label={PAYMENT_STATUS_LABELS[i.paymentStatus]} />
              </span>
            </li>
          ))}
        </History>

        <History title="Payments received" count={payments?.length ?? 0} empty="No payments recorded yet.">
          {(payments ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span>
                {f.date(p.paid_on)} <span className="text-muted">· {paymentMethodLabel(p.method, f.market)}{p.invoices ? ` · ${p.invoices.number}` : ""}</span>
              </span>
              <span className="font-medium tabular-nums">{f.money(p.amount, p.currency)}</span>
            </li>
          ))}
        </History>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-sm font-semibold">Manage client</h2>
        <ClientDangerActions id={id} name={client.name} archived={!!client.archived_at} />
      </div>
    </>
  );
}
