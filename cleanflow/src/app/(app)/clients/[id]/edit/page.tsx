import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/server/context";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { marketConfig } from "@/lib/market";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();
  return (
    <>
      <PageHeader title={`Edit ${client.name}`} back={{ href: `/clients/${id}`, label: client.name }} />
      <Card className="max-w-3xl">
        <CardContent className="py-6">
          <ClientForm clientId={id} defaults={client} terms={marketConfig(business.market).terms} />
        </CardContent>
      </Card>
    </>
  );
}
