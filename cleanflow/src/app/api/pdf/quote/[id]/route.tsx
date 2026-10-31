import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { apiContext, fileResponse } from "@/lib/server/api";
import { CommercialPdf } from "@/lib/pdf/documents";
import { clientAddress } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { marketConfig } from "@/lib/market";
import { DOCUMENT_DISCLAIMER } from "@/lib/documents/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if ("error" in ctx) return ctx.error;
  const { supabase, business } = ctx;
  const { id } = await params;
  const { data: q } = await supabase.from("quotes").select("*, quote_items(*), clients(*)").eq("id", id).maybeSingle();
  if (!q || !q.clients) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cfg = marketConfig(business.market);
  const money = (n: number) => formatMoney(n, q.currency, business.market);
  const buffer = await renderToBuffer(
    <CommercialPdf
      kind="quote"
      docTitle={`Cleaning ${cfg.terms.quote}`}
      number={q.number}
      paper={cfg.paper}
      business={business}
      client={{ name: q.clients.name, email: q.clients.email, phone: q.clients.phone, address: clientAddress(q.clients) }}
      meta={[`Date: ${formatDate(q.issue_date, business.date_format)}`, ...(q.valid_until ? [`Valid until: ${formatDate(q.valid_until, business.date_format)}`] : [])]}
      items={[...q.quote_items].sort((a, b) => a.position - b.position).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), amount: Number(i.amount) }))}
      money={money}
      total={Number(q.total)}
      notes={q.notes}
      footer={null}
      disclaimer={`${cfg.terms.quote} ${q.number} · v${q.version}. ${DOCUMENT_DISCLAIMER}`}
    />,
  );
  return fileResponse(new Uint8Array(buffer), `${cfg.terms.quote}-${q.number}.pdf`, "application/pdf", true);
}
