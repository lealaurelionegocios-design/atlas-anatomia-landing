import type { Metadata } from "next";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig, serviceTypeOptions } from "@/lib/market";
import { checklistsForMarket, defaultChecklistFor } from "@/lib/checklists";
import { addDays, isIsoDate } from "@/lib/dates";
import { currencySymbol } from "@/lib/money";
import { JobForm } from "../job-form";

export const metadata: Metadata = { title: "Book a job" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ clientId?: string; date?: string }> }) {
  const { supabase, business, today } = await requireBusiness();
  const { clientId, date } = await searchParams;
  const clients = await fetchClientOptions(supabase);
  const types = serviceTypeOptions(business.market);
  return (
    <>
      <PageHeader title="Book a job" description="For a job priced from an accepted estimate/quote, use “Book as job” on that document instead." back={{ href: "/jobs", label: "Jobs" }} />
      <JobForm
        clients={clients}
        serviceTypes={types}
        checklists={checklistsForMarket(business.market).map((c) => ({ slug: c.slug, title: c.title }))}
        defaultChecklistByService={Object.fromEntries(types.map((t) => [t.value, defaultChecklistFor(t.value, business.market).slug]))}
        currencySymbol={currencySymbol(business.currency)}
        terms={marketConfig(business.market).terms}
        defaults={{
          client_id: clients.some((c) => c.id === clientId) ? clientId! : "",
          service_type: "standard",
          scheduled_date: date && isIsoDate(date) ? date : addDays(today, 1),
          start_time: "09:00",
          duration_minutes: 180,
          price: 0,
          execution_notes: "",
          checklist_slug: "standard-cleaning-checklist",
        }}
      />
    </>
  );
}
