import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/context";
import { Logo } from "@/components/layout/logo";
import { marketConfig } from "@/lib/market";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Set up CleanFlow" };

export default async function OnboardingPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data: business } = await supabase.from("businesses").select("id, market, onboarding_completed_at").maybeSingle();
  if (business?.onboarding_completed_at) redirect("/dashboard");
  const { data: firstClient } = business ? await supabase.from("clients").select("id, name").eq("is_demo", false).limit(1).maybeSingle() : { data: null };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-white px-4 py-3 sm:px-8">
        <Logo href="/onboarding" />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <OnboardingWizard
          email={user.email ?? ""}
          hasBusiness={!!business}
          terms={business ? marketConfig(business.market).terms : marketConfig("US").terms}
          firstClient={firstClient ?? null}
        />
      </main>
    </div>
  );
}
