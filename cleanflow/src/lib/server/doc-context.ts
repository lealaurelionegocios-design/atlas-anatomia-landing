import "server-only";
import type { ServerSupabase } from "../supabase/server";
import type { Business } from "./context";
import type { DocContext, DocOverrides } from "../documents/types";
import { clientAddress } from "../format";
import { formatDate, formatDuration, formatTime } from "../dates";
import { formatMoney } from "../money";
import { serviceTypeLabel } from "../market";
import { documentOverridesSchema } from "../validation";

/** Builds the data a kit document is filled with. Client/job data is only used when explicitly selected. */
export async function buildDocContext(
  supabase: ServerSupabase,
  business: Business,
  today: string,
  opts: { clientId?: string | null; jobId?: string | null },
): Promise<DocContext> {
  let client: DocContext["client"] = null;
  let job: DocContext["job"] = null;
  let clientId = opts.clientId ?? null;

  if (opts.jobId) {
    const { data } = await supabase.from("jobs").select("*, clients(*)").eq("id", opts.jobId).maybeSingle();
    if (data) {
      clientId = data.client_id;
      job = {
        serviceLabel: serviceTypeLabel(data.service_type, business.market),
        date: formatDate(data.scheduled_date, business.date_format),
        time: formatTime(data.start_time, business.market),
        duration: formatDuration(data.duration_minutes),
        price: formatMoney(data.price, data.currency, business.market),
        address: data.clients ? clientAddress(data.clients) || null : null,
      };
    }
  }
  if (clientId) {
    const { data } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
    if (data) {
      client = { name: data.name, email: data.email, phone: data.phone, address: clientAddress(data) || null, service_preferences: data.service_preferences };
    }
  }

  return {
    business: {
      name: business.name,
      owner_name: business.owner_name,
      email: business.email,
      phone: business.phone,
      address: business.address,
      logo_data_url: business.logo_data_url,
      currency: business.currency,
      market: business.market === "UK" ? "UK" : "US",
      date_format: business.date_format,
      invoice_footer: business.invoice_footer,
      payment_terms_days: business.payment_terms_days,
    },
    client,
    job,
    today,
  };
}

export async function loadOverrides(supabase: ServerSupabase, slug: string): Promise<DocOverrides> {
  const { data } = await supabase.from("document_customizations").select("content").eq("slug", slug).maybeSingle();
  const parsed = documentOverridesSchema.safeParse(data?.content ?? {});
  return parsed.success ? parsed.data : {};
}
