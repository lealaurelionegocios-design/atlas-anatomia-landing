import type { Metadata } from "next";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig, serviceTypeOptions } from "@/lib/market";
import { marginToPercent } from "@/lib/pricing";
import { PricingCalculator } from "./pricing-calculator";

export const metadata: Metadata = { title: "Pricing Calculator" };

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { supabase, business } = await requireBusiness();
  const { clientId } = await searchParams;
  const clients = await fetchClientOptions(supabase);
  const cfg = marketConfig(business.market);
  return (
    <>
      <PageHeader
        title="Smart Cleaning Pricing Calculator"
        description={`Price = total costs ÷ (1 − target margin). Save the result as a draft ${cfg.terms.quote.toLowerCase()} for a client.`}
      />
      <PricingCalculator
        clients={clients}
        initialClientId={clients.some((c) => c.id === clientId) ? clientId : undefined}
        defaults={{ hourlyLabourCost: Number(business.default_hourly_cost), targetMarginPercent: marginToPercent(Number(business.default_target_margin)) }}
        currency={business.currency}
        market={business.market}
        serviceTypes={serviceTypeOptions(business.market)}
        terms={cfg.terms}
      />
    </>
  );
}
