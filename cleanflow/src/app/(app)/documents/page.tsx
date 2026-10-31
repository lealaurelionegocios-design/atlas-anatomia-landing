import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, FileText, MessageSquareText, Receipt, ScrollText } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, PageHeader } from "@/components/ui/misc";
import { documentTemplates } from "@/lib/documents/templates";
import { marketConfig } from "@/lib/market";

export const metadata: Metadata = { title: "Document Kit" };

const ICONS = { Forms: ScrollText, Sales: FileText, Billing: Receipt, Checklists: ClipboardCheck, "Client communication": MessageSquareText } as const;

export default async function DocumentsPage() {
  const { supabase, business } = await requireBusiness();
  const cfg = marketConfig(business.market);
  const templates = documentTemplates(cfg.market);
  const { data: custom } = await supabase.from("document_customizations").select("slug");
  const customised = new Set((custom ?? []).map((c) => c.slug));
  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <>
      <PageHeader
        title="Professional Document Kit"
        description={`${templates.length} editable templates for the ${cfg.market === "UK" ? "UK" : "US"} market, filled with your business details. Preview, customise, print or export to PDF (${cfg.paper === "A4" ? "A4" : "US Letter"}).`}
      />
      <Alert tone="info" className="mb-6">
        These are business templates, not legally validated contracts, tax documents or safety certificates. Requirements vary by US state/locality and in the UK — review them
        with a qualified adviser before relying on them.
      </Alert>
      <div className="space-y-8">
        {categories.map((cat) => {
          const Icon = ICONS[cat];
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Icon className="size-4 text-brand" /> {cat}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <li key={t.slug}>
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <Link href={`/documents/${t.slug}`} className="flex h-full flex-col p-4">
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-medium text-forest">
                              <span className="mr-1 text-muted">{t.number}.</span>
                              {t.title(cfg.market)}
                            </span>
                            {customised.has(t.slug) && <Badge tone="brand">Customised</Badge>}
                          </span>
                          <span className="mt-1 text-sm text-muted">{t.description}</span>
                        </Link>
                      </Card>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
