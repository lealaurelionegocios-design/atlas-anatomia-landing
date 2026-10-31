import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig } from "@/lib/market";
import { InvoiceForm } from "../../invoice-form";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const { data: inv } = await supabase.from("invoices").select("*, invoice_items(*)").eq("id", id).maybeSingle();
  if (!inv) notFound();
  if (inv.status === "void") redirect(`/invoices/${id}`);
  const clients = await fetchClientOptions(supabase, inv.client_id);
  const items = [...inv.invoice_items].sort((a, b) => a.position - b.position);
  return (
    <>
      <PageHeader title={`Edit ${inv.number}`} back={{ href: `/invoices/${id}`, label: inv.number }} />
      <InvoiceForm
        invoiceId={id}
        clients={clients}
        currency={inv.currency}
        market={business.market}
        terms={marketConfig(business.market).terms}
        lockClient={!!inv.job_id}
        defaults={{
          client_id: inv.client_id,
          job_id: inv.job_id ?? "",
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          status: inv.status === "draft" ? "draft" : "issued",
          notes: inv.notes ?? "",
          items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
        }}
      />
    </>
  );
}
