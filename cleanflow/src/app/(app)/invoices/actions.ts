"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { invoiceSchema, paymentSchema } from "@/lib/validation";
import { nullable } from "@/lib/supabase/nullable";

function revalidateMoney(invoiceId?: string) {
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
}

export async function saveInvoice(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(invoiceSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  const { supabase } = await requireBusiness();
  const { data, error } = await supabase.rpc("save_invoice", {
    p_invoice_id: nullable(id),
    p_client_id: v.client_id,
    p_job_id: nullable(v.job_id),
    p_issue_date: v.issue_date,
    p_due_date: v.due_date,
    p_status: v.status,
    p_notes: v.notes ?? "",
    p_items: v.items,
  });
  if (error || !data) return dbError(error);
  revalidateMoney(data);
  return ok({ id: data }, id ? "Invoice updated" : "Invoice created");
}

export async function setInvoiceStatus(id: string, status: "issued" | "void" | "draft"): Promise<ActionResult> {
  if (!["issued", "void", "draft"].includes(status)) return fail("Invalid status.");
  const { supabase } = await requireBusiness();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) return dbError(error);
  revalidateMoney(id);
  return ok(undefined, status === "void" ? "Invoice voided" : status === "issued" ? "Invoice issued" : "Moved back to draft");
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { data: inv } = await supabase.from("invoices").select("status, payments(id)").eq("id", id).maybeSingle();
  if (!inv) return fail("Not found.");
  if (inv.status !== "draft" || inv.payments.length > 0) return fail("Only draft invoices without payments can be deleted. Void it instead.");
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return dbError(error);
  revalidateMoney();
  return ok(undefined, "Invoice deleted");
}

export async function recordPayment(input: unknown): Promise<ActionResult> {
  const parsed = parse(paymentSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  const { supabase, business } = await requireBusiness();
  const { data: invoice } = await supabase.from("invoices").select("currency").eq("id", v.invoice_id).maybeSingle();
  if (!invoice) return fail("Invoice not found.");
  // The database re-checks status, currency and the outstanding balance.
  const { error } = await supabase.from("payments").insert({ ...v, business_id: business.id, currency: invoice.currency });
  if (error) return dbError(error);
  revalidateMoney(v.invoice_id);
  return ok(undefined, "Payment recorded");
}

export async function deletePayment(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Not found.");
  const { supabase } = await requireBusiness();
  const { data, error } = await supabase.from("payments").delete().eq("id", id).select("invoice_id").single();
  if (error || !data) return dbError(error, "Payment not found.");
  revalidateMoney(data.invoice_id ?? undefined);
  return ok(undefined, "Payment removed");
}
