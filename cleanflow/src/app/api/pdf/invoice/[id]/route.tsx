import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { apiContext, fileResponse } from "@/lib/server/api";
import { CommercialPdf } from "@/lib/pdf/documents";
import { clientAddress } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import { formatMoney, sumMoney } from "@/lib/money";
import { marketConfig } from "@/lib/market";
import { invoiceBalance } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiContext();
  if ("error" in ctx) return ctx.error;
  const { supabase, business } = ctx;
  const { id } = await params;
  const { data: inv } = await supabase.from("invoices").select("*, invoice_items(*), clients(*), payments(amount)").eq("id", id).maybeSingle();
  if (!inv || !inv.clients) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cfg = marketConfig(business.market);
  const paid = sumMoney(inv.payments.map((p) => p.amount));
  const title = inv.status === "void" ? "Invoice (VOID)" : inv.status === "draft" ? "Invoice (DRAFT)" : "Invoice";
  const buffer = await renderToBuffer(
    <CommercialPdf
      kind="invoice"
      docTitle={title}
      number={inv.number}
      paper={cfg.paper}
      business={business}
      client={{ name: inv.clients.name, email: inv.clients.email, phone: inv.clients.phone, address: clientAddress(inv.clients) }}
      meta={[`Invoice date: ${formatDate(inv.issue_date, business.date_format)}`, `Due date: ${formatDate(inv.due_date, business.date_format)}`]}
      items={[...inv.invoice_items].sort((a, b) => a.position - b.position).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), amount: Number(i.amount) }))}
      money={(n) => formatMoney(n, inv.currency, business.market)}
      total={Number(inv.total)}
      paid={paid}
      balance={invoiceBalance({ ...inv, paid })}
      notes={inv.notes}
      footer={business.invoice_footer}
      disclaimer="Generated with CleanFlow. Sales tax/VAT is not calculated automatically; this invoice may not meet every jurisdiction's tax-invoice requirements."
    />,
  );
  return fileResponse(new Uint8Array(buffer), `Invoice-${inv.number}.pdf`, "application/pdf", true);
}
