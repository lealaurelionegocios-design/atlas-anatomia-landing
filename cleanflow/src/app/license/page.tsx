import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/context";
import { licenseRequired } from "@/lib/env";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimLicenseButton } from "./claim-button";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Activate access" };

export default async function LicensePage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  if (!licenseRequired()) redirect("/dashboard");
  const { data: active } = await supabase.rpc("has_active_license");
  if (active) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 py-8">
          <Logo />
          <h1 className="text-xl font-semibold">Activate your access</h1>
          <p className="text-sm text-muted">
            We couldn&apos;t find an active licence for <strong>{user.email}</strong>. If you purchased CleanFlow, make sure you signed up with the same email address you used at
            checkout and that your email is confirmed, then check again.
          </p>
          <ClaimLicenseButton />
          <form action={signOut}>
            <button className="text-sm text-brand hover:underline" type="submit">
              Sign in with a different account
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
