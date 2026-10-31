import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, FileText, Printer } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { Alert, DefinitionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { clientAddress, formatter } from "@/lib/format";
import { jobStatusLabel, serviceTypeLabel } from "@/lib/market";
import { formatDateLong, formatDuration } from "@/lib/dates";
import { currencySymbol } from "@/lib/money";
import { checklistBySlug } from "@/lib/checklists";
import { PAYMENT_STATUS_LABELS, invoicePaymentStatus } from "@/lib/finance";
import { sumMoney } from "@/lib/money";
import { Checklist, CreateInvoiceButton, DeleteJobButton, EditJobDialog, JobStatusButtons } from "./job-client";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, today } = await requireBusiness();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, clients(*), quotes(id, number), job_checklist_items(id, section, label, done, position), invoices(id, number, status, total, due_date, payments(amount))")
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();
  const f = formatter(business);
  const items = [...job.job_checklist_items].sort((a, b) => a.position - b.position);
  const invoice = job.invoices;
  const invoiceStatus = invoice ? invoicePaymentStatus({ ...invoice, paid: sumMoney(invoice.payments.map((p) => p.amount)) }, today) : null;
  const checklist = checklistBySlug(job.checklist_slug);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {job.clients?.name} <StatusBadge status={job.status} label={jobStatusLabel(job.status, f.market)} />
            {job.is_demo && <DemoBadge />}
          </span>
        }
        description={`${serviceTypeLabel(job.service_type, f.market)} · ${formatDateLong(job.scheduled_date, f.market)} at ${f.time(job.start_time)}`}
        back={{ href: "/jobs", label: "Jobs" }}
        actions={
          <>
            <EditJobDialog
              id={id}
              currencySymbol={currencySymbol(job.currency)}
              priceLocked={!!invoice && invoice.status !== "void"}
              defaults={{
                scheduled_date: job.scheduled_date,
                start_time: job.start_time,
                duration_minutes: job.duration_minutes,
                price: Number(job.price),
                execution_notes: job.execution_notes ?? "",
              }}
            />
            <JobStatusButtons id={id} status={job.status} invoiced={!!invoice && invoice.status !== "void"} cancelledLabel={f.terms.cancelled} />
            {job.status === "completed" && !invoice && <CreateInvoiceButton jobId={id} />}
          </>
        }
      />

      {job.status === "completed" && !invoice && (
        <Alert tone="info" className="mb-6">
          This job is complete. Create the invoice so you can record payment.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  ["Client", <Link key="c" href={`/clients/${job.client_id}`} className="text-brand hover:underline">{job.clients?.name}</Link>],
                  ["Price", f.money(job.price, job.currency)],
                  ["Date", f.date(job.scheduled_date)],
                  ["Time & duration", `${f.time(job.start_time)} · ${formatDuration(job.duration_minutes)}`],
                  ["Service address", job.clients ? clientAddress(job.clients) : null],
                  ["From", job.quotes ? <Link key="q" href={`/quotes/${job.quotes.id}`} className="text-brand hover:underline">{job.quotes.number}</Link> : "Booked directly"],
                  ["Client preferences", job.clients?.service_preferences],
                  ["Job notes", job.execution_notes],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {invoice ? (
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                    {invoice.number} · {f.money(invoice.total, job.currency)}
                  </Link>
                  {invoiceStatus && <StatusBadge status={invoiceStatus} label={PAYMENT_STATUS_LABELS[invoiceStatus]} />}
                </div>
              ) : job.status === "completed" ? (
                <CreateInvoiceButton jobId={id} />
              ) : (
                <p className="text-muted">You can invoice this job once it is marked completed.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/documents/booking-confirmation?jobId=${id}`}>
                  <FileText /> Booking confirmation
                </Link>
              </Button>
              {checklist && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href={`/documents/${checklist.slug}?jobId=${id}`}>
                    <Printer /> Printable checklist
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
          {!invoice && <DeleteJobButton id={id} />}
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{checklist?.title ?? "Checklist"}</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length ? (
              <Checklist items={items} disabled={job.status === "cancelled"} />
            ) : (
              <EmptyState icon={<ClipboardList />} title="No checklist for this job" className="border-0" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
