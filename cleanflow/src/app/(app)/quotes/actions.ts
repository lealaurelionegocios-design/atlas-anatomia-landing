"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { convertQuoteSchema, pricingSchema, quoteSchema, quoteStatusSchema } from "@/lib/validation";
import { calculatePrice, percentToMargin } from "@/lib/pricing";
import { addDays } from "@/lib/dates";
import { serviceTypeLabel } from "@/lib/market";
import { checklistBySlug, defaultChecklistFor, flattenChecklist } from "@/lib/checklists";
import { nullable } from "@/lib/supabase/nullable";

/** Saves the calculator result as a draft quote/estimate linked to a client. */
export async function createQuoteFromPricing(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(pricingSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  if (!v.client_id || !z.uuid().safeParse(v.client_id).success) return fail("Choose a client to save this price.", { client_id: "Choose a client." });

  // Recalculate on the server — the browser's numbers are never trusted.
  const outcome = calculatePrice({
    hours: v.hours,
    hourlyLabourCost: v.hourlyLabourCost,
    cleaners: v.cleaners,
    supplies: v.supplies,
    travel: v.travel,
    otherCosts: v.otherCosts,
    targetMargin: percentToMargin(v.targetMarginPercent),
    manualPrice: v.manualPrice,
  });
  if (!outcome.ok) return fail("Please check the calculator values.", outcome.errors as Record<string, string>);
  const r = outcome.result;

  const { supabase, business, today } = await requireBusiness();
  const label = serviceTypeLabel(v.service_type, business.market);
  const { data, error } = await supabase.rpc("save_quote", {
    p_quote_id: nullable<string>(null),
    p_client_id: v.client_id,
    p_service_type: v.service_type,
    p_issue_date: today,
    p_valid_until: addDays(today, 30),
    p_notes: "",
    p_pricing: {
      inputs: {
        hours: v.hours,
        hourlyLabourCost: v.hourlyLabourCost,
        cleaners: v.cleaners,
        supplies: v.supplies,
        travel: v.travel,
        otherCosts: v.otherCosts,
        targetMargin: r.targetMargin,
        manualPrice: v.manualPrice,
      },
      result: {
        labour: r.labour,
        totalCosts: r.totalCosts,
        suggestedPrice: r.suggestedPrice,
        finalPrice: r.finalPrice,
        grossContribution: r.grossContribution,
        actualMargin: r.actualMargin,
      },
      calculatedAt: new Date().toISOString(),
    },
    p_items: [{ description: label, quantity: 1, unit_price: r.finalPrice }],
  });
  if (error || !data) return dbError(error);
  revalidatePath("/quotes");
  return ok({ id: data }, "Saved as draft");
}

export async function saveQuote(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(quoteSchema, input);
  if ("error" in parsed) return parsed.error;
  const q = parsed.data;
  const { supabase } = await requireBusiness();
  const { data, error } = await supabase.rpc("save_quote", {
    p_quote_id: nullable(id),
    p_client_id: q.client_id,
    p_service_type: q.service_type,
    p_issue_date: q.issue_date,
    p_valid_until: nullable(q.valid_until),
    p_notes: q.notes ?? "",
    p_pricing: nullable(null),
    p_items: q.items,
  });
  if (error || !data) return dbError(error);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${data}`);
  return ok({ id: data }, id ? "Saved as a new version" : "Saved");
}

const TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "accepted", "declined"],
  sent: ["accepted", "declined", "draft"],
  accepted: ["draft", "declined"],
  declined: ["draft", "sent"],
};

export async function setQuoteStatus(id: string, status: unknown): Promise<ActionResult> {
  const s = quoteStatusSchema.safeParse(status);
  if (!s.success) return fail("Invalid status.");
  const { supabase } = await requireBusiness();
  const { data: quote } = await supabase.from("quotes").select("status").eq("id", id).maybeSingle();
  if (!quote) return fail("Not found.");
  if (!TRANSITIONS[quote.status]?.includes(s.data)) return fail(`Cannot change from ${quote.status} to ${s.data}.`);
  const { error } = await supabase.from("quotes").update({ status: s.data }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return ok(undefined, "Status updated");
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { data: job } = await supabase.from("jobs").select("id").eq("quote_id", id).maybeSingle();
  if (job) return fail("This has been converted into a job and cannot be deleted.");
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/quotes");
  return ok(undefined, "Deleted");
}

/** Converts an accepted quote into a scheduled job with the chosen checklist. */
export async function convertQuoteToJob(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(convertQuoteSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  const { supabase, business } = await requireBusiness();
  const { data: quote } = await supabase.from("quotes").select("service_type").eq("id", v.quote_id).maybeSingle();
  if (!quote) return fail("Not found.");
  const checklist = checklistBySlug(v.checklist_slug) ?? (v.checklist_slug === "none" ? null : defaultChecklistFor(quote.service_type, business.market));
  const { data, error } = await supabase.rpc("convert_quote_to_job", {
    p_quote_id: v.quote_id,
    p_scheduled_date: v.scheduled_date,
    p_start_time: v.start_time,
    p_duration_minutes: v.duration_minutes,
    p_checklist_slug: nullable(checklist?.slug ?? null),
    p_checklist: checklist ? flattenChecklist(checklist) : [],
  });
  if (error || !data) return dbError(error);
  revalidatePath("/jobs");
  revalidatePath(`/quotes/${v.quote_id}`);
  revalidatePath("/dashboard");
  return ok({ id: data }, "Job booked");
}
