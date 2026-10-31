import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { apiContext, fileResponse } from "@/lib/server/api";
import { buildDocContext, loadOverrides } from "@/lib/server/doc-context";
import { DOCUMENT_DISCLAIMER, documentTemplate, renderDocument } from "@/lib/documents/templates";
import { KitDocumentPdf } from "@/lib/pdf/documents";
import { marketConfig } from "@/lib/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ctx = await apiContext();
  if ("error" in ctx) return ctx.error;
  const { supabase, business, today } = ctx;
  const { slug } = await params;
  const template = documentTemplate(slug);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const uuid = z.uuid();
  const clientId = request.nextUrl.searchParams.get("clientId");
  const jobId = request.nextUrl.searchParams.get("jobId");
  const docCtx = await buildDocContext(supabase, business, today, {
    clientId: clientId && uuid.safeParse(clientId).success ? clientId : null,
    jobId: jobId && uuid.safeParse(jobId).success ? jobId : null,
  });
  const blocks = renderDocument(template, docCtx, await loadOverrides(supabase, slug));
  const cfg = marketConfig(business.market);
  const title = template.title(cfg.market);
  const buffer = await renderToBuffer(<KitDocumentPdf title={title} paper={cfg.paper} business={business} blocks={blocks} disclaimer={DOCUMENT_DISCLAIMER} />);
  return fileResponse(new Uint8Array(buffer), `${title.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`, "application/pdf", true);
}
