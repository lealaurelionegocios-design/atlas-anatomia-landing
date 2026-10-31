import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { PaperSize } from "../market";

const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

let registered = false;
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  // Don't hyphenate words mid-line.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const C = {
  forest: "#173F37",
  brand: "#22694E",
  mint: "#D8EDE0",
  canvas: "#F7F9F6",
  ink: "#20332E",
  muted: "#5B6E68",
  line: "#DFE7E2",
};

export const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, color: C.ink, paddingTop: 40, paddingBottom: 64, paddingHorizontal: 44, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  bizName: { fontSize: 14, lineHeight: 1.25, fontWeight: 700, color: C.forest },
  small: { fontSize: 8.5, color: C.muted },
  docTitle: { fontSize: 18, lineHeight: 1.2, fontWeight: 700, color: C.forest, textAlign: "right", marginBottom: 2 },
  docMeta: { fontSize: 9, color: C.muted, textAlign: "right" },
  sectionTitle: { fontSize: 10.5, lineHeight: 1.3, fontWeight: 700, color: C.forest, marginBottom: 6, marginTop: 14 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 10 },
  row: { flexDirection: "row" },
  th: { fontSize: 8, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  tableHead: { flexDirection: "row", backgroundColor: C.canvas, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, paddingVertical: 7, paddingHorizontal: 8 },
  right: { textAlign: "right" },
  bold: { fontWeight: 700 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderColor: C.line, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: C.muted, maxWidth: "85%" },
});

export interface PdfBusiness {
  name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_data_url: string | null;
}

export function PdfShell({
  title,
  paper,
  business,
  docTitle,
  meta,
  footerNote,
  children,
}: {
  title: string;
  paper: PaperSize;
  business: PdfBusiness;
  docTitle: string;
  meta?: string[];
  footerNote: string;
  children: ReactNode;
}) {
  registerFonts();
  const contact = [business.phone, business.email].filter(Boolean).join("  ·  ");
  return (
    <Document title={title} author={business.name} creator="CleanFlow Business Manager" producer="CleanFlow Business Manager">
      <Page size={paper} style={s.page}>
        <View style={s.header} fixed>
          <View style={{ flexDirection: "row", gap: 10, maxWidth: "58%" }}>
            {business.logo_data_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={business.logo_data_url} style={{ width: 52, height: 52, objectFit: "contain" }} />
            ) : null}
            <View>
              <Text style={s.bizName}>{business.name}</Text>
              {business.address ? <Text style={s.small}>{business.address}</Text> : null}
              {contact ? <Text style={s.small}>{contact}</Text> : null}
            </View>
          </View>
          <View style={{ maxWidth: "40%" }}>
            <Text style={s.docTitle}>{docTitle}</Text>
            {(meta ?? []).map((m) => (
              <Text key={m} style={s.docMeta}>
                {m}
              </Text>
            ))}
          </View>
        </View>
        <View style={{ height: 3, backgroundColor: C.brand, marginBottom: 16, borderRadius: 2 }} fixed />
        {children}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footerNote}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function Checkbox({ checked = false }: { checked?: boolean }) {
  return (
    <View style={{ width: 9, height: 9, borderWidth: 1, borderColor: C.muted, borderRadius: 2, marginRight: 6, marginTop: 1.5, backgroundColor: checked ? C.brand : undefined }} />
  );
}
