import type { Metadata } from "next";
import { requireBusiness } from "@/lib/server/context";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig } from "@/lib/market";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  const { business } = await requireBusiness();
  return (
    <>
      <PageHeader title="Add client" back={{ href: "/clients", label: "Clients" }} />
      <Card className="max-w-3xl">
        <CardContent className="py-6">
          <ClientForm terms={marketConfig(business.market).terms} />
        </CardContent>
      </Card>
    </>
  );
}
