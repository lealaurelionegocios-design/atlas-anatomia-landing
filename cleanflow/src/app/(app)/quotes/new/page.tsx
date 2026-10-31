import type { Metadata } from "next";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig, serviceTypeOptions } from "@/lib/market";
import { addDays } from "@/lib/dates";
import { QuoteForm } from "../quote-form";

export const metadata: Metadata = { title: "New quote" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { supabase, business, today } = await requireBusiness();
  const { clientId } = await searchParams;
  const clients = await fetchClientOptions(supabase);
  const cfg = marketConfig(business.market);
  return (
    <>
      <PageHeader
        title={`New ${cfg.terms.quote.toLowerCase()}`}
        description="Tip: the Pricing Calculator suggests a price from your costs."
        back={{ href: "/quotes", label: cfg.terms.quotes }}
      />
      <QuoteForm
        clients={clients}
        serviceTypes={serviceTypeOptions(business.market)}
        currency={business.currency}
        market={business.market}
        terms={cfg.terms}
        defaults={{
          client_id: clients.some((c) => c.id === clientId) ? clientId! : "",
          service_type: "standard",
          issue_date: today,
          valid_until: addDays(today, 30),
          notes: "",
          items: [{ description: "Standard Cleaning", quantity: 1, unit_price: 0 }],
        }}
      />
    </>
  );
}
