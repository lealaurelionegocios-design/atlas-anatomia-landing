"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { businessSettingsSchema, logoSchema } from "@/lib/validation";
import { percentToMargin } from "@/lib/pricing";

export async function updateSettings(input: unknown): Promise<ActionResult> {
  const parsed = parse(businessSettingsSchema, input);
  if ("error" in parsed) return parsed.error;
  const { confirm_currency_change, default_target_margin_percent, ...v } = parsed.data;
  const { supabase, business } = await requireBusiness();

  if (v.currency !== business.currency) {
    // Changing currency never converts historical amounts: require explicit confirmation.
    const tables = ["quotes", "invoices", "payments", "expenses", "jobs"] as const;
    const counts = await Promise.all(tables.map((t) => supabase.from(t).select("id", { count: "exact", head: true })));
    const existing = counts.reduce((a, r) => a + (r.count ?? 0), 0);
    if (existing > 0 && !confirm_currency_change) {
      return fail("Confirm the currency change.", {
        confirm_currency_change: `You have ${existing} existing record(s) in ${business.currency}. They will keep their original currency and will not be converted.`,
      });
    }
  }

  const { error } = await supabase
    .from("businesses")
    .update({ ...v, default_target_margin: percentToMargin(default_target_margin_percent) })
    .eq("id", business.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Settings saved");
}

export async function updateLogo(dataUrl: string | null): Promise<ActionResult> {
  if (dataUrl !== null) {
    const parsed = logoSchema.safeParse(dataUrl);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid image.");
  }
  const { supabase, business } = await requireBusiness();
  const { error } = await supabase.from("businesses").update({ logo_data_url: dataUrl }).eq("id", business.id);
  if (error) return dbError(error);
  revalidatePath("/settings");
  return ok(undefined, dataUrl ? "Logo updated" : "Logo removed");
}

export async function deleteAccount(confirmName: string): Promise<ActionResult> {
  const { supabase, business } = await requireBusiness();
  if (confirmName.trim() !== business.name.trim()) return fail("Type your business name exactly to confirm.");
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return dbError(error);
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
