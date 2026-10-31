import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireBusiness } from "@/lib/server/context";
import { fetchClientOptions } from "@/lib/server/queries";
import { buildDocContext, loadOverrides } from "@/lib/server/doc-context";
import { PageHeader } from "@/components/ui/misc";
import { documentTemplate } from "@/lib/documents/templates";
import { marketConfig } from "@/lib/market";
import { DocumentEditor } from "./doc-editor";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ clientId?: string; jobId?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const template = documentTemplate(slug);
  if (!template) notFound();
  const { supabase, business, today } = await requireBusiness();
  const cfg = marketConfig(business.market);
  const uuid = z.uuid();
  const clientId = sp.clientId && uuid.safeParse(sp.clientId).success ? sp.clientId : null;
  const jobId = template.usesJob && sp.jobId && uuid.safeParse(sp.jobId).success ? sp.jobId : null;
  const [ctx, saved, clients] = await Promise.all([buildDocContext(supabase, business, today, { clientId, jobId }), loadOverrides(supabase, slug), fetchClientOptions(supabase)]);
  const title = template.title(cfg.market);

  return (
    <>
      <div className="no-print">
        <PageHeader title={title} description={template.description} back={{ href: "/documents", label: "Document Kit" }} />
        {!template.markets.includes(cfg.market) && (
          <p className="mb-4 rounded-lg bg-warning-soft px-4 py-2 text-sm text-warning">This template is designed for the {template.markets.join("/")} market.</p>
        )}
      </div>
      <DocumentEditor slug={slug} title={title} ctx={ctx} saved={saved} clients={clients} clientId={clientId} jobId={jobId} paper={cfg.paper} />
    </>
  );
}
