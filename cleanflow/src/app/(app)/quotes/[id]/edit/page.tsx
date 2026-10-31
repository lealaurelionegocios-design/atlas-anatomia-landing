import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig, serviceTypeOptions, type ServiceType } from "@/lib/market";
import { QuoteForm } from "../../quote-form";

export const metadata: Metadata = { title: "Edit quote" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const { data: quote } = await supabase.from("quotes").select("*, quote_items(*), jobs(id)").eq("id", id).maybeSingle();
  if (!quote) notFound();
  if (quote.jobs || !["draft", "sent"].includes(quote.status)) redirect(`/quotes/${id}`);
  const clients = await fetchClientOptions(supabase, quote.client_id);
  const cfg = marketConfig(business.market);
  const items = [...quote.quote_items].sort((a, b) => a.position - b.position);
  return (
    <>
      <PageHeader title={`Edit ${quote.number}`} description={`Saving creates version ${quote.version + 1}.`} back={{ href: `/quotes/${id}`, label: quote.number }} />
      <QuoteForm
        quoteId={id}
        clients={clients}
        serviceTypes={serviceTypeOptions(business.market, quote.service_type)}
        currency={quote.currency}
        market={business.market}
        terms={cfg.terms}
        defaults={{
          client_id: quote.client_id,
          service_type: quote.service_type as ServiceType,
          issue_date: quote.issue_date,
          valid_until: quote.valid_until ?? "",
          notes: quote.notes ?? "",
          items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
        }}
      />
    </>
  );
}
