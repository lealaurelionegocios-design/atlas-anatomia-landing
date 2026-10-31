"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/server/context";
import { dbError, ok, parse, type ActionResult } from "@/lib/server/actions";
import { clientSchema } from "@/lib/validation";
import { z } from "zod";

export async function saveClient(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(clientSchema, input);
  if ("error" in parsed) return parsed.error;
  const { supabase, business } = await requireBusiness();

  if (id) {
    if (!z.uuid().safeParse(id).success) return dbError(null, "Client not found.");
    const { data, error } = await supabase.from("clients").update(parsed.data).eq("id", id).select("id").single();
    if (error || !data) return dbError(error, "Client not found.");
    revalidatePath("/clients");
    return ok({ id: data.id }, "Client updated");
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, business_id: business.id })
    .select("id")
    .single();
  if (error || !data) return dbError(error);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return ok({ id: data.id }, "Client added");
}

export async function setClientArchived(id: string, archived: boolean): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return ok(undefined, archived ? "Client archived" : "Client restored");
}

/** Erases a client and all linked records (privacy / erasure request). */
export async function deleteClientPermanently(id: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { error } = await supabase.rpc("delete_client_permanently", { p_client_id: id });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Client and linked records deleted");
}
