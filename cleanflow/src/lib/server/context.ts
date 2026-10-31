import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import type { Tables } from "../supabase/database.types";
import { licenseRequired } from "../env";
import { todayIn } from "../dates";

export type Business = Tables<"businesses">;

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Signed-in user + their business, or a redirect to login / onboarding. */
export const requireBusiness = cache(async () => {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("*").maybeSingle();
  if (!business) redirect("/onboarding");
  if (licenseRequired()) {
    const { data: active } = await supabase.rpc("has_active_license");
    if (!active) redirect("/license");
  }
  return { supabase, user, business, today: todayIn(business.timezone) };
});

export type AppContext = Awaited<ReturnType<typeof requireBusiness>>;
