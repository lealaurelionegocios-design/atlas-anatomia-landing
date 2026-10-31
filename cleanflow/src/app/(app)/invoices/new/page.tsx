import type { Metadata } from "next";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig } from "@/lib/market";
import { addDays } from "@/lib/dates";
import { InvoiceForm } from "../invoice-form";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { supabase, business, today } = await requireBusiness();
  const { clientId } = await searchParams;
  const clients = await fetchClientOptions(supabase);
  return (
    <>
      <PageHeader title="New invoice" description="For a completed job, use “Create invoice” on the job instead — it links the two." back={{ href: "/invoices", label: "Invoices" }} />
      <InvoiceForm
        clients={clients}
        currency={business.currency}
        market={business.market}
        terms={marketConfig(business.market).terms}
        defaults={{
          client_id: clients.some((c) => c.id === clientId) ? clientId! : "",
          job_id: "",
          issue_date: today,
          due_date: addDays(today, business.payment_terms_days),
          status: "issued",
          notes: "",
          items: [{ description: "Cleaning service", quantity: 1, unit_price: 0 }],
        }}
      />
    </>
  );
}
