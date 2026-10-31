"use server";

import { getSessionUser } from "@/lib/server/context";
import { fail, ok, type ActionResult } from "@/lib/server/actions";

export async function claimLicense(): Promise<ActionResult<{ status: string }>> {
  const { supabase, user } = await getSessionUser();
  if (!user) return fail("Please sign in.");
  const { data, error } = await supabase.rpc("claim_my_license");
  if (error) return fail("We couldn't check your licence. Please try again.");
  return ok({ status: data ?? "none" });
}
