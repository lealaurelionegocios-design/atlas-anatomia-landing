import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { marginToPercent } from "@/lib/pricing";
import type { DateFormat, Market, Currency } from "@/lib/market";
import { LogoUploader, SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business, user } = await requireBusiness();
  return (
    <>
      <PageHeader
        title="Settings"
        description={`Signed in as ${user.email}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/data">
              <Database /> Data, export & privacy
            </Link>
          </Button>
        }
      />
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoUploader current={business.logo_data_url} />
          </CardContent>
        </Card>
        <SettingsForm
          savedCurrency={business.currency}
          defaults={{
            name: business.name,
            owner_name: business.owner_name ?? "",
            email: business.email ?? "",
            phone: business.phone ?? "",
            address: business.address ?? "",
            market: business.market as Market,
            currency: business.currency as Currency,
            date_format: business.date_format as DateFormat,
            timezone: business.timezone,
            default_hourly_cost: Number(business.default_hourly_cost),
            default_target_margin_percent: marginToPercent(Number(business.default_target_margin)),
            quote_prefix: business.quote_prefix,
            invoice_prefix: business.invoice_prefix,
            invoice_footer: business.invoice_footer ?? "",
            payment_terms_days: business.payment_terms_days,
            confirm_currency_change: false,
          }}
        />
      </div>
    </>
  );
}
