"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { jobSchema, jobStatusSchema, jobUpdateSchema } from "@/lib/validation";
import { checklistBySlug, flattenChecklist } from "@/lib/checklists";
import { addDays, formatDate } from "@/lib/dates";
import { serviceTypeLabel } from "@/lib/market";
import { nullable } from "@/lib/supabase/nullable";

function revalidateJobs(id?: string) {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/jobs/${id}`);
}

export async function createJob(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(jobSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  const { supabase } = await requireBusiness();
  const checklist = checklistBySlug(v.checklist_slug);
  const { data, error } = await supabase.rpc("create_job", {
    p_client_id: v.client_id,
    p_service_type: v.service_type,
    p_scheduled_date: v.scheduled_date,
    p_start_time: v.start_time,
    p_duration_minutes: v.duration_minutes,
    p_price: v.price,
    p_execution_notes: v.execution_notes ?? "",
    p_checklist_slug: nullable(checklist?.slug ?? null),
    p_checklist: checklist ? flattenChecklist(checklist) : [],
  });
  if (error || !data) return dbError(error);
  revalidateJobs();
  return ok({ id: data }, "Job booked");
}

export async function updateJob(id: string, input: unknown): Promise<ActionResult> {
  const parsed = parse(jobUpdateSchema, input);
  if ("error" in parsed) return parsed.error;
  const { supabase } = await requireBusiness();
  const { data: invoice } = await supabase.from("invoices").select("id").eq("job_id", id).neq("status", "void").maybeSingle();
  const { data: current } = await supabase.from("jobs").select("price").eq("id", id).maybeSingle();
  if (!current) return fail("Job not found.");
  if (invoice && Number(current.price) !== parsed.data.price) return fail("This job is invoiced. Change the amount on the invoice instead.");
  const { error } = await supabase.from("jobs").update(parsed.data).eq("id", id);
  if (error) return dbError(error);
  revalidateJobs(id);
  return ok(undefined, "Job updated");
}

export async function setJobStatus(id: string, status: unknown): Promise<ActionResult> {
  const s = jobStatusSchema.safeParse(status);
  if (!s.success) return fail("Invalid status.");
  const { supabase } = await requireBusiness();
  const { error } = await supabase.from("jobs").update({ status: s.data }).eq("id", id);
  if (error) return dbError(error);
  revalidateJobs(id);
  return ok(undefined, "Status updated");
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(itemId).success) return fail("Not found.");
  const { supabase } = await requireBusiness();
  const { data, error } = await supabase.from("job_checklist_items").update({ done }).eq("id", itemId).select("job_id").single();
  if (error || !data) return dbError(error);
  revalidatePath(`/jobs/${data.job_id}`);
  return ok(undefined);
}

/** Creates the invoice for a completed job (once). */
export async function createInvoiceFromJob(jobId: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, business, today } = await requireBusiness();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, quotes(number, total, quote_items(description, quantity, unit_price, position))")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return fail("Job not found.");

  const label = `${serviceTypeLabel(job.service_type, business.market)} — ${formatDate(job.scheduled_date, business.date_format)}`;
  const quoteItems = job.quotes && Number(job.quotes.total) === Number(job.price) ? [...job.quotes.quote_items].sort((a, b) => a.position - b.position) : null;
  const items = quoteItems?.length
    ? quoteItems.map((i, idx) => ({
        description: idx === 0 ? `${i.description} — ${formatDate(job.scheduled_date, business.date_format)}` : i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      }))
    : [{ description: label, quantity: 1, unit_price: Number(job.price) }];

  const { data, error } = await supabase.rpc("save_invoice", {
    p_invoice_id: nullable<string>(null),
    p_client_id: job.client_id,
    p_job_id: job.id,
    p_issue_date: today,
    p_due_date: addDays(today, business.payment_terms_days),
    p_status: "issued",
    p_notes: job.quotes ? `Ref: ${job.quotes.number}` : "",
    p_items: items,
  });
  if (error || !data) return dbError(error);
  revalidateJobs(jobId);
  revalidatePath("/invoices");
  return ok({ id: data }, "Invoice created");
}

export async function deleteJob(id: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { data: invoice } = await supabase.from("invoices").select("id").eq("job_id", id).maybeSingle();
  if (invoice) return fail("This job has an invoice and cannot be deleted. Cancel it instead.");
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) return dbError(error);
  revalidateJobs();
  return ok(undefined, "Job deleted");
}
