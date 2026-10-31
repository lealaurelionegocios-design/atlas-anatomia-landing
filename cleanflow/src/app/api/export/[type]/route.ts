import { NextResponse, type NextRequest } from "next/server";
import { apiContext, fileResponse } from "@/lib/server/api";
import { fetchInvoices } from "@/lib/server/queries";
import { toCsv } from "@/lib/csv";
import { isIsoDate } from "@/lib/dates";
import { PAYMENT_STATUS_LABELS } from "@/lib/finance";
import { clientAddress } from "@/lib/format";
import { expenseCategoryLabel, jobStatusLabel, paymentMethodLabel, quoteStatusLabel, serviceTypeLabel } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const ctx = await apiContext();
  if ("error" in ctx) return ctx.error;
  const { supabase, business, today } = ctx;
  const { type } = await params;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const range = { from: from && isIsoDate(from) ? from : null, to: to && isIsoDate(to) ? to : null };
  const m = business.market;
  const stamp = `${today}${range.from || range.to ? `_${range.from ?? "start"}_to_${range.to ?? "end"}` : ""}`;
  const csv = (name: string, headers: string[], rows: (string | number | boolean | null)[][]) =>
    fileResponse(toCsv(headers, rows), `cleanflow-${name}-${stamp}.csv`, "text/csv; charset=utf-8");

  switch (type) {
    case "clients": {
      const { data } = await supabase.from("clients").select("*").order("name");
      return csv(
        "clients",
        ["ID", "Name", "Email", "Phone", "Address", "Service preferences", "Notes", "Archived", "Demo", "Created"],
        (data ?? []).map((c) => [c.id, c.name, c.email, c.phone, clientAddress(c).replace(/\n/g, ", "), c.service_preferences, c.notes, c.archived_at ? "yes" : "no", c.is_demo ? "yes" : "no", c.created_at]),
      );
    }
    case "quotes": {
      let q = supabase.from("quotes").select("*, clients(name)").order("issue_date");
      if (range.from) q = q.gte("issue_date", range.from);
      if (range.to) q = q.lte("issue_date", range.to);
      const { data } = await q;
      return csv(
        "quotes",
        ["ID", "Number", "Client", "Service", "Status", "Issue date", "Valid until", "Total", "Currency", "Version", "Demo"],
        (data ?? []).map((r) => [r.id, r.number, r.clients?.name ?? "", serviceTypeLabel(r.service_type, m), quoteStatusLabel(r.status), r.issue_date, r.valid_until, Number(r.total).toFixed(2), r.currency, r.version, r.is_demo ? "yes" : "no"]),
      );
    }
    case "jobs": {
      let q = supabase.from("jobs").select("*, clients(name)").order("scheduled_date");
      if (range.from) q = q.gte("scheduled_date", range.from);
      if (range.to) q = q.lte("scheduled_date", range.to);
      const { data } = await q;
      return csv(
        "jobs",
        ["ID", "Client", "Service", "Date", "Start", "Duration (min)", "Price", "Currency", "Status", "Quote ID", "Demo"],
        (data ?? []).map((r) => [r.id, r.clients?.name ?? "", serviceTypeLabel(r.service_type, m), r.scheduled_date, r.start_time.slice(0, 5), r.duration_minutes, Number(r.price).toFixed(2), r.currency, jobStatusLabel(r.status, m), r.quote_id, r.is_demo ? "yes" : "no"]),
      );
    }
    case "invoices": {
      const rows = await fetchInvoices(supabase, today, range);
      return csv(
        "invoices",
        ["ID", "Number", "Client", "Issue date", "Due date", "Total", "Paid", "Balance", "Currency", "Payment status", "Job ID", "Demo"],
        rows.map((r) => [r.id, r.number, r.clients?.name ?? "", r.issue_date, r.due_date, Number(r.total).toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2), r.currency, PAYMENT_STATUS_LABELS[r.paymentStatus], r.job_id, r.is_demo ? "yes" : "no"]),
      );
    }
    case "payments": {
      let q = supabase.from("payments").select("*, clients(name), invoices(number)").order("paid_on");
      if (range.from) q = q.gte("paid_on", range.from);
      if (range.to) q = q.lte("paid_on", range.to);
      const { data } = await q;
      return csv(
        "payments",
        ["ID", "Date received", "Client", "Invoice", "Amount", "Currency", "Method", "Reference", "Notes", "Demo"],
        (data ?? []).map((r) => [r.id, r.paid_on, r.clients?.name ?? "", r.invoices?.number ?? "", Number(r.amount).toFixed(2), r.currency, paymentMethodLabel(r.method, m), r.reference, r.notes, r.is_demo ? "yes" : "no"]),
      );
    }
    case "expenses": {
      let q = supabase.from("expenses").select("*").order("spent_on");
      if (range.from) q = q.gte("spent_on", range.from);
      if (range.to) q = q.lte("spent_on", range.to);
      const { data } = await q;
      return csv(
        "expenses",
        ["ID", "Date", "Category", "Description", "Amount", "Currency", "Demo"],
        (data ?? []).map((r) => [r.id, r.spent_on, expenseCategoryLabel(r.category, m), r.description, Number(r.amount).toFixed(2), r.currency, r.is_demo ? "yes" : "no"]),
      );
    }
    case "all": {
      const tables = ["clients", "quotes", "quote_items", "quote_versions", "jobs", "job_checklist_items", "invoices", "invoice_items", "payments", "expenses", "document_customizations"] as const;
      const results = await Promise.all(tables.map((t) => supabase.from(t).select("*").limit(100000)));
      const body = {
        exported_at: new Date().toISOString(),
        format: "cleanflow-export-v1",
        business,
        ...Object.fromEntries(tables.map((t, i) => [t, results[i].data ?? []])),
      };
      return fileResponse(JSON.stringify(body, null, 2), `cleanflow-export-${today}.json`, "application/json; charset=utf-8");
    }
    default:
      return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
  }
}
