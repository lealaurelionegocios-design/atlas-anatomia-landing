import { Text, View } from "@react-pdf/renderer";
import type { PaperSize } from "../market";
import type { DocBlock } from "../documents/types";
import { C, Checkbox, PdfShell, s, type PdfBusiness } from "./shared";

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface CommercialDocProps {
  kind: "quote" | "invoice";
  docTitle: string;
  number: string;
  paper: PaperSize;
  business: PdfBusiness;
  client: { name: string; email: string | null; phone: string | null; address: string };
  meta: string[];
  items: LineItem[];
  money: (n: number) => string;
  total: number;
  paid?: number;
  balance?: number;
  notes: string | null;
  footer: string | null;
  disclaimer: string;
}

/** Estimate / quote and invoice PDFs, generated from real records. */
export function CommercialPdf(p: CommercialDocProps) {
  return (
    <PdfShell title={`${p.docTitle} ${p.number}`} paper={p.paper} business={p.business} docTitle={p.docTitle} meta={[p.number, ...p.meta]} footerNote={p.disclaimer}>
      <View style={[s.row, { gap: 16, marginBottom: 18 }]}>
        <View style={[s.box, { flex: 1 }]}>
          <Text style={s.th}>{p.kind === "invoice" ? "Bill to" : "Prepared for"}</Text>
          <Text style={[s.bold, { marginTop: 4 }]}>{p.client.name}</Text>
          {p.client.address ? <Text>{p.client.address}</Text> : null}
          {p.client.email ? <Text style={s.small}>{p.client.email}</Text> : null}
          {p.client.phone ? <Text style={s.small}>{p.client.phone}</Text> : null}
        </View>
        <View style={[s.box, { flex: 1, backgroundColor: C.canvas, borderColor: C.canvas }]}>
          <Text style={s.th}>{p.kind === "invoice" ? "Amount due" : "Total"}</Text>
          <Text style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 700, color: C.forest, marginTop: 4, marginBottom: 2 }}>{p.money(p.kind === "invoice" ? (p.balance ?? p.total) : p.total)}</Text>
          {p.meta.map((m) => (
            <Text key={m} style={s.small}>
              {m}
            </Text>
          ))}
        </View>
      </View>

      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 5 }]}>Description</Text>
        <Text style={[s.th, s.right, { flex: 1 }]}>Qty</Text>
        <Text style={[s.th, s.right, { flex: 2 }]}>Unit price</Text>
        <Text style={[s.th, s.right, { flex: 2 }]}>Amount</Text>
      </View>
      {p.items.map((i, idx) => (
        <View key={idx} style={s.tableRow} wrap={false}>
          <Text style={{ flex: 5 }}>{i.description}</Text>
          <Text style={[s.right, { flex: 1 }]}>{i.quantity}</Text>
          <Text style={[s.right, { flex: 2 }]}>{p.money(i.unit_price)}</Text>
          <Text style={[s.right, { flex: 2 }]}>{p.money(i.amount)}</Text>
        </View>
      ))}
      <View style={{ alignSelf: "flex-end", width: "45%", marginTop: 10 }} wrap={false}>
        <View style={[s.row, { justifyContent: "space-between", paddingVertical: 3 }]}>
          <Text style={s.bold}>Total</Text>
          <Text style={s.bold}>{p.money(p.total)}</Text>
        </View>
        {p.kind === "invoice" && p.paid !== undefined ? (
          <>
            <View style={[s.row, { justifyContent: "space-between", paddingVertical: 3 }]}>
              <Text style={{ color: C.muted }}>Paid</Text>
              <Text>{p.money(p.paid)}</Text>
            </View>
            <View style={[s.row, { justifyContent: "space-between", paddingVertical: 4, borderTopWidth: 1, borderColor: C.line }]}>
              <Text style={s.bold}>Balance due</Text>
              <Text style={s.bold}>{p.money(p.balance ?? 0)}</Text>
            </View>
          </>
        ) : null}
        <Text style={[s.small, { marginTop: 4, textAlign: "right" }]}>No tax has been added unless shown as a line item.</Text>
      </View>

      {p.notes ? (
        <View wrap={false}>
          <Text style={s.sectionTitle}>Notes</Text>
          <Text>{p.notes}</Text>
        </View>
      ) : null}
      {p.footer ? (
        <View wrap={false} style={{ marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderColor: C.line }}>
          <Text style={s.small}>{p.footer}</Text>
        </View>
      ) : null}
      {p.kind === "quote" ? (
        <View wrap={false} style={{ marginTop: 28, flexDirection: "row", gap: 24 }}>
          {["Accepted by (client)", "Date"].map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <View style={{ borderBottomWidth: 1, borderColor: C.muted, height: 24 }} />
              <Text style={s.small}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </PdfShell>
  );
}

function Lines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ borderBottomWidth: 1, borderColor: C.line, height: 16 }} />
      ))}
    </>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "heading":
      return <Text style={s.sectionTitle}>{block.text}</Text>;
    case "paragraph":
      return <Text style={{ marginBottom: 8 }}>{block.text}</Text>;
    case "notice":
      return (
        <View style={{ backgroundColor: C.canvas, borderLeftWidth: 3, borderColor: C.brand, padding: 8, marginVertical: 8 }} wrap={false}>
          <Text style={s.small}>{block.text}</Text>
        </View>
      );
    case "fields":
      return (
        <View style={{ marginBottom: 6 }}>
          {block.title ? <Text style={s.sectionTitle}>{block.title}</Text> : null}
          {block.fields.map((f) => (
            <View key={f.label} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={s.th}>{f.label}</Text>
              {f.value ? <Text style={{ paddingVertical: 2 }}>{f.value}</Text> : <Lines count={f.lines ?? 1} />}
            </View>
          ))}
        </View>
      );
    case "checklist":
      return (
        <View style={{ marginBottom: 4 }}>
          <Text style={s.sectionTitle}>{block.title}</Text>
          {block.items.map((item) => (
            <View key={item} style={[s.row, { marginBottom: 4 }]} wrap={false}>
              <Checkbox />
              <Text style={{ flex: 1 }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "table": {
      const blank = Array.from({ length: block.blankRows ?? 0 }, () => block.columns.map(() => ""));
      const rows = [...block.rows, ...blank];
      return (
        <View style={{ marginBottom: 8 }}>
          {block.title ? <Text style={s.sectionTitle}>{block.title}</Text> : null}
          <View style={s.tableHead}>
            {block.columns.map((c, i) => (
              <Text key={c} style={[s.th, { flex: i === 0 ? 3 : 2 }]}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((r, ri) => (
            <View key={ri} style={[s.tableRow, { minHeight: 22 }]} wrap={false}>
              {r.map((cell, ci) => (
                <Text key={ci} style={{ flex: ci === 0 ? 3 : 2 }}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }
    case "messages":
      return (
        <View>
          {block.items.map((m) => (
            <View key={m.id} style={[s.box, { marginBottom: 10 }]} wrap={false}>
              <Text style={[s.bold, { color: C.forest, marginBottom: 4 }]}>{m.title}</Text>
              <Text>{m.body}</Text>
            </View>
          ))}
        </View>
      );
    case "signature":
      return (
        <View style={{ flexDirection: "row", gap: 24, marginTop: 22 }} wrap={false}>
          {block.labels.map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <View style={{ borderBottomWidth: 1, borderColor: C.muted, height: 24 }} />
              <Text style={s.small}>{l}</Text>
            </View>
          ))}
        </View>
      );
  }
}

/** Kit documents (forms, checklists, messages) from template blocks. */
export function KitDocumentPdf({ title, paper, business, blocks, disclaimer, meta }: { title: string; paper: PaperSize; business: PdfBusiness; blocks: DocBlock[]; disclaimer: string; meta?: string[] }) {
  return (
    <PdfShell title={title} paper={paper} business={business} docTitle={title} meta={meta} footerNote={disclaimer}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </PdfShell>
  );
}
