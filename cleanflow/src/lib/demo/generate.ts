import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { addDays } from "../dates";
import { defaultChecklistFor, flattenChecklist } from "../checklists";
import { serviceTypeLabel, type Market } from "../market";
import { nullable } from "../supabase/nullable";

// Fictional sample data. Every row is flagged is_demo = true so it can be
// told apart from real records and removed in one click.

type Db = SupabaseClient<Database>;

const CLIENTS: Record<Market, Array<{ name: string; email: string; phone: string; address_line1: string; city: string; region: string; postal_code: string; prefs: string }>> = {
  US: [
    { name: "Avery Johnson (Demo)", email: "avery@example.com", phone: "(555) 010-2001", address_line1: "1428 Elm Street", city: "Austin", region: "TX", postal_code: "78701", prefs: "Two dogs — friendly. Fragrance-free products." },
    { name: "Morgan Lee (Demo)", email: "morgan@example.com", phone: "(555) 010-2002", address_line1: "77 Lakeview Drive", city: "Austin", region: "TX", postal_code: "78704", prefs: "Focus on kitchen and bathrooms." },
    { name: "Riverside Rentals (Demo)", email: "office@example.com", phone: "(555) 010-2003", address_line1: "300 River Road, Unit 4B", city: "Round Rock", region: "TX", postal_code: "78664", prefs: "Vacant units — move-out cleans." },
    { name: "Sam Patel (Demo)", email: "sam@example.com", phone: "(555) 010-2004", address_line1: "9 Cedar Court", city: "Austin", region: "TX", postal_code: "78745", prefs: "Bi-weekly, Fridays preferred." },
  ],
  UK: [
    { name: "Olivia Hughes (Demo)", email: "olivia@example.com", phone: "07700 900101", address_line1: "14 Rosewood Avenue", city: "Bristol", region: "Avon", postal_code: "BS6 5AB", prefs: "Cat in the home. Eco products please." },
    { name: "James Wright (Demo)", email: "james@example.com", phone: "07700 900102", address_line1: "Flat 3, 22 Station Road", city: "Bristol", region: "Avon", postal_code: "BS1 4QA", prefs: "Fortnightly, Tuesday mornings." },
    { name: "Harbour Lettings (Demo)", email: "lettings@example.com", phone: "0117 496 0103", address_line1: "5 Quay Street", city: "Bristol", region: "Avon", postal_code: "BS1 4DB", prefs: "End of tenancy cleans for managed flats." },
    { name: "Priya Shah (Demo)", email: "priya@example.com", phone: "07700 900104", address_line1: "8 Orchard Close", city: "Bath", region: "Somerset", postal_code: "BA2 3LP", prefs: "Deep clean before family visit." },
  ],
};

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export async function generateDemoData(db: Db, opts: { businessId: string; market: Market; today: string }) {
  const { businessId, market, today } = opts;
  const moveType = market === "UK" ? "end_of_tenancy" : "move_in_out";

  const clients = await must(
    db
      .from("clients")
      .insert(
        CLIENTS[market].map((c) => ({
          business_id: businessId,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address_line1: c.address_line1,
          city: c.city,
          region: c.region,
          postal_code: c.postal_code,
          service_preferences: c.prefs,
          is_demo: true,
        })),
      )
      .select("id, name"),
  );
  const [a, b, c, d] = clients.map((x) => x.id);

  const plan: Array<{ client: string; type: string; price: number; issued: number; flow: "paid" | "partial" | "unpaid" | "upcoming" | "sent" | "draft" }> = [
    { client: a, type: "standard", price: 140, issued: -40, flow: "paid" },
    { client: b, type: "deep", price: 285, issued: -25, flow: "partial" },
    { client: c, type: moveType, price: 360, issued: -35, flow: "unpaid" },
    { client: d, type: "standard", price: 120, issued: -5, flow: "upcoming" },
    { client: a, type: "deep", price: 260, issued: -2, flow: "sent" },
    { client: b, type: "recurring", price: 110, issued: 0, flow: "draft" },
  ];

  for (const [idx, p] of plan.entries()) {
    const issue = addDays(today, p.issued);
    const quoteId = await must(
      db.rpc("save_quote", {
        p_quote_id: nullable<string>(null),
        p_client_id: p.client,
        p_service_type: p.type,
        p_issue_date: issue,
        p_valid_until: addDays(issue, 30),
        p_notes: "Sample document created by the demo data generator.",
        p_pricing: nullable(null),
        p_items: [{ description: serviceTypeLabel(p.type, market), quantity: 1, unit_price: p.price }],
        p_is_demo: true,
      }),
    );
    if (p.flow === "draft") continue;
    await must(db.from("quotes").update({ status: "sent" }).eq("id", quoteId).select("id"));
    if (p.flow === "sent") continue;
    await must(db.from("quotes").update({ status: "accepted" }).eq("id", quoteId).select("id"));

    const jobDate = p.flow === "upcoming" ? addDays(today, 3) : addDays(issue, 5);
    const checklist = defaultChecklistFor(p.type, market);
    const jobId = await must(
      db.rpc("convert_quote_to_job", {
        p_quote_id: quoteId,
        p_scheduled_date: jobDate,
        p_start_time: idx % 2 ? "13:00" : "09:00",
        p_duration_minutes: p.price > 200 ? 300 : 180,
        p_checklist_slug: checklist.slug,
        p_checklist: flattenChecklist(checklist),
      }),
    );
    if (p.flow === "upcoming") continue;

    await must(db.from("job_checklist_items").update({ done: true }).eq("job_id", jobId).select("id"));
    await must(db.from("jobs").update({ status: "completed" }).eq("id", jobId).select("id"));
    const invoiceId = await must(
      db.rpc("save_invoice", {
        p_invoice_id: nullable<string>(null),
        p_client_id: p.client,
        p_job_id: jobId,
        p_issue_date: jobDate,
        p_due_date: addDays(jobDate, 14),
        p_status: "issued",
        p_notes: "Sample invoice (demo).",
        p_items: [{ description: serviceTypeLabel(p.type, market), quantity: 1, unit_price: p.price }],
      }),
    );
    if (p.flow === "paid" || p.flow === "partial") {
      await must(
        db
          .from("payments")
          .insert({
            business_id: businessId,
            invoice_id: invoiceId,
            amount: p.flow === "paid" ? p.price : 100,
            currency: market === "UK" ? "GBP" : "USD",
            paid_on: addDays(jobDate, 2),
            method: "bank_transfer",
            is_demo: true,
          })
          .select("id"),
      );
    }
  }

  // A separate job booked without a quote, for next week.
  const standard = defaultChecklistFor("standard", market);
  await must(
    db.rpc("create_job", {
      p_client_id: d,
      p_service_type: "recurring",
      p_scheduled_date: addDays(today, 7),
      p_start_time: "10:00",
      p_duration_minutes: 150,
      p_price: 110,
      p_execution_notes: "Regular visit (demo).",
      p_checklist_slug: standard.slug,
      p_checklist: flattenChecklist(standard),
      p_is_demo: true,
    }),
  );

  const currency = market === "UK" ? "GBP" : "USD";
  await must(
    db
      .from("expenses")
      .insert([
        { business_id: businessId, spent_on: addDays(today, -38), category: "supplies", description: "Cleaning products restock (demo)", amount: 64.2, currency, is_demo: true },
        { business_id: businessId, spent_on: addDays(today, -20), category: "vehicle", description: "Fuel (demo)", amount: 45, currency, is_demo: true },
        { business_id: businessId, spent_on: addDays(today, -9), category: "equipment", description: "Vacuum filters (demo)", amount: 28.5, currency, is_demo: true },
        { business_id: businessId, spent_on: addDays(today, -3), category: "insurance", description: "Liability insurance — monthly (demo)", amount: 39, currency, is_demo: true },
      ])
      .select("id"),
  );
}
