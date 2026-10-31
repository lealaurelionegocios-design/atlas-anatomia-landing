"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/server/context";
import { dbError, ok, parse, type ActionResult } from "@/lib/server/actions";
import { expenseSchema } from "@/lib/validation";

export async function addExpense(input: unknown): Promise<ActionResult> {
  const parsed = parse(expenseSchema, input);
  if ("error" in parsed) return parsed.error;
  const { supabase, business } = await requireBusiness();
  const { error } = await supabase.from("expenses").insert({ ...parsed.data, business_id: business.id, currency: business.currency });
  if (error) return dbError(error);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return ok(undefined, "Expense added");
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return ok(undefined, "Expense deleted");
}
