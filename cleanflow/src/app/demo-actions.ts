"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, type ActionResult } from "@/lib/server/actions";
import { generateDemoData } from "@/lib/demo/generate";

export async function loadDemoData(): Promise<ActionResult> {
  const { supabase, business, today } = await requireBusiness();
  const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_demo", true);
  if (count) return fail("Demo data is already loaded.");
  try {
    await generateDemoData(supabase, { businessId: business.id, market: business.market === "UK" ? "UK" : "US", today });
  } catch (e) {
    console.error("[demo]", e);
    await supabase.rpc("remove_demo_data");
    return fail("We couldn't create the demo data. Please try again.");
  }
  revalidatePath("/", "layout");
  return ok(undefined, "Demo data loaded");
}

export async function removeDemoData(): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { error } = await supabase.rpc("remove_demo_data");
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Demo data removed");
}
