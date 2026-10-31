import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { DemoDataButton } from "@/components/demo-data-button";
import { DeleteAccount } from "./data-client";

export const metadata: Metadata = { title: "Data & privacy" };

const EXPORTS = [
  ["clients", "Clients"],
  ["quotes", "Estimates / quotes"],
  ["jobs", "Jobs"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["expenses", "Expenses"],
] as const;

export default async function DataPage() {
  const { supabase, business } = await requireBusiness();
  const { count: demoCount } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_demo", true);
  return (
    <>
      <PageHeader title="Data, export & privacy" back={{ href: "/settings", label: "Settings" }} />
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export your data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">Download a full copy of your business data at any time. CSV files open in Excel, Numbers or Google Sheets.</p>
            <Button asChild>
              <a href="/api/export/all">
                <Download /> Full export (JSON)
              </a>
            </Button>
            <div className="flex flex-wrap gap-2">
              {EXPORTS.map(([key, label]) => (
                <Button key={key} asChild variant="outline" size="sm">
                  <a href={`/api/export/${key}`}>
                    <Download /> {label} CSV
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {demoCount ? `${demoCount} demo client(s) and their records are loaded. They are marked “Demo”.` : "Load fictional sample records to explore CleanFlow. They stay separate from your real data."}
            </p>
            <DemoDataButton mode={demoCount ? "remove" : "load"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            <p>
              You are responsible for the client data you store. Collect only what you need to deliver the service, and never store alarm codes, key locations or passwords in
              CleanFlow.
            </p>
            <p>
              To honour a client&apos;s deletion request, open the client and choose <strong>Delete permanently</strong>. Check your record-keeping obligations first: tax
              authorities usually require invoices and payment records to be kept for several years (commonly up to 7 years in the US and 6 years in the UK for many
              businesses).
            </p>
          </CardContent>
        </Card>

        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Delete account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted">Deletes your login and all data for {business.name}. This cannot be undone.</p>
            <DeleteAccount businessName={business.name} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
