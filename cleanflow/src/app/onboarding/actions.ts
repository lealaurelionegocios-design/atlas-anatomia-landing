"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { onboardingBusinessSchema } from "@/lib/validation";
import { MARKET_CONFIG } from "@/lib/market";
import { percentToMargin } from "@/lib/pricing";

export async function createBusinessFromOnboarding(input: unknown): Promise<ActionResult> {
  const parsed = parse(onboardingBusinessSchema, input);
  if ("error" in parsed) return parsed.error;
  const v = parsed.data;
  const { supabase, user } = await getSessionUser();
  if (!user) return fail("Please sign in again.");
  const cfg = MARKET_CONFIG[v.market];
  const { error } = await supabase.rpc("create_business", {
    p_name: v.name,
    p_market: v.market,
    p_currency: cfg.defaultCurrency,
    p_date_format: cfg.defaultDateFormat,
    p_timezone: v.timezone,
    p_owner_name: v.owner_name ?? "",
    p_email: v.email ?? user.email ?? "",
    p_phone: v.phone ?? "",
    p_address: v.address ?? "",
    p_default_hourly_cost: v.default_hourly_cost,
    p_default_target_margin: percentToMargin(v.default_target_margin_percent),
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return ok(undefined, "Business created");
}

export async function completeOnboarding(): Promise<ActionResult> {
  const { supabase, business } = await requireBusiness();
  const { error } = await supabase.from("businesses").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", business.id);
  if (error) return dbError(error);
  return ok(undefined);
}
