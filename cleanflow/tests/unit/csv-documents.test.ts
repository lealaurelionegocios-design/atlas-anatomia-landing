import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { documentTemplate, documentTemplates, editableSlots, fillPlaceholders, renderDocument } from "@/lib/documents/templates";
import type { DocContext } from "@/lib/documents/types";
import { defaultChecklistFor, flattenChecklist } from "@/lib/checklists";
import { marketConfig, serviceTypeLabel, serviceTypeOptions } from "@/lib/market";

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('He said "hi", ok')).toBe('"He said ""hi"", ok"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(12.5)).toBe("12.5");
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1 555")).toBe("\"'+1 555\"");
    expect(csvCell("-12.50")).toBe("-12.50");
  });
  it("adds a BOM and CRLF line endings", () => {
    const csv = toCsv(["a", "b"], [[1, "£2"]]);
    expect(csv.startsWith("﻿a,b\r\n1,£2\r\n")).toBe(true);
  });
});

const ctx = (market: "US" | "UK", withClient = true): DocContext => ({
  business: {
    name: "Sparkle & Co",
    owner_name: "Dana Lee",
    email: "hello@sparkle.test",
    phone: "555-0100",
    address: "1 Main St",
    logo_data_url: null,
    currency: market === "UK" ? "GBP" : "USD",
    market,
    date_format: market === "UK" ? "DD/MM/YYYY" : "MM/DD/YYYY",
    invoice_footer: "Thank you!",
    payment_terms_days: 14,
  },
  client: withClient ? { name: "Jordan Smith", email: null, phone: null, address: "22 Oak Rd", service_preferences: null } : null,
  job: null,
  today: "2026-03-04",
});

describe("document kit", () => {
  it("has the 12 kit documents, localised per market", () => {
    expect(documentTemplates()).toHaveLength(12);
    const us = documentTemplates("US").map((t) => t.slug);
    const uk = documentTemplates("UK").map((t) => t.slug);
    expect(us).toContain("move-in-move-out-checklist");
    expect(us).not.toContain("end-of-tenancy-checklist");
    expect(uk).toContain("end-of-tenancy-checklist");
    expect(uk).not.toContain("move-in-move-out-checklist");
    expect(us).toHaveLength(11);
    expect(uk).toHaveLength(11);
    expect(documentTemplate("cleaning-estimate")!.title("US")).toBe("Cleaning Estimate");
    expect(documentTemplate("cleaning-estimate")!.title("UK")).toBe("Cleaning Quote");
  });

  it("every template renders without unresolved placeholders", () => {
    for (const t of documentTemplates()) {
      for (const withClient of [true, false]) {
        const blocks = renderDocument(t, ctx(t.markets[0], withClient));
        expect(blocks.length).toBeGreaterThan(0);
        expect(JSON.stringify(blocks)).not.toMatch(/\{\{/);
      }
    }
  });

  it("fills client and business details", () => {
    expect(fillPlaceholders("Hi {{client_first_name}} — {{signature}}", ctx("US"))).toBe("Hi Jordan — Dana Lee, Sparkle & Co");
    expect(fillPlaceholders("Hi {{client_first_name}}", ctx("US", false))).toBe("Hi [Client name]");
  });

  it("applies saved overrides and keeps placeholders working", () => {
    const t = documentTemplate("customer-follow-up-messages")!;
    const blocks = renderDocument(t, ctx("UK"), { "after-first-clean": "Cheers {{client_first_name}}!" });
    const msgs = blocks.find((b) => b.type === "messages");
    expect(msgs && msgs.type === "messages" && msgs.items[0].body).toBe("Cheers Jordan!");
  });

  it("exposes editable slots with raw placeholders", () => {
    const slots = editableSlots(documentTemplate("booking-confirmation")!.build(ctx("US")));
    expect(slots.map((s) => s.id)).toEqual(["intro", "prep", "changes"]);
    expect(slots[0].text).toContain("{{client_first_name}}");
  });
});

describe("market localisation", () => {
  it("uses market terminology and paper", () => {
    expect(marketConfig("US")).toMatchObject({ locale: "en-US", paper: "LETTER", defaultCurrency: "USD", defaultDateFormat: "MM/DD/YYYY" });
    expect(marketConfig("UK")).toMatchObject({ locale: "en-GB", paper: "A4", defaultCurrency: "GBP", defaultDateFormat: "DD/MM/YYYY" });
    expect(marketConfig("US").terms.quote).toBe("Estimate");
    expect(marketConfig("UK").terms.quote).toBe("Quote");
  });
  it("offers market-specific service types", () => {
    expect(serviceTypeOptions("US").map((o) => o.value)).toContain("move_in_out");
    expect(serviceTypeOptions("UK").map((o) => o.value)).toContain("end_of_tenancy");
    expect(serviceTypeOptions("UK").map((o) => o.value)).not.toContain("move_in_out");
    expect(serviceTypeOptions("UK", "move_in_out").map((o) => o.value)).toContain("move_in_out");
    expect(serviceTypeLabel("end_of_tenancy", "UK")).toBe("End of Tenancy Cleaning");
  });
  it("picks the right default checklist", () => {
    expect(defaultChecklistFor("move_in_out", "US").slug).toBe("move-in-move-out-checklist");
    expect(defaultChecklistFor("end_of_tenancy", "UK").slug).toBe("end-of-tenancy-checklist");
    expect(defaultChecklistFor("standard", "UK").slug).toBe("standard-cleaning-checklist");
    expect(flattenChecklist(defaultChecklistFor("deep", "US")).length).toBeGreaterThan(15);
  });
});
