import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  businessSettingsSchema,
  clientSchema,
  expenseSchema,
  invoiceSchema,
  jobSchema,
  onboardingBusinessSchema,
  paymentSchema,
  pricingSchema,
  quoteSchema,
} from "@/lib/validation";

const uuid = "4b9b1a52-7a11-4c41-9e4e-6c3f6f9d2a10";

// Raw form input as a browser would send it (strings, empty optional fields).
const cases: Array<[string, z.ZodType, Record<string, unknown>]> = [
  ["client", clientSchema, { name: "Jordan", email: "", phone: "", address_line1: "", city: "", notes: "" }],
  ["onboarding", onboardingBusinessSchema, { name: "Biz", owner_name: "", email: "", phone: "", address: "", market: "UK", timezone: "Europe/London", default_hourly_cost: "15", default_target_margin_percent: "40" }],
  [
    "settings",
    businessSettingsSchema,
    { name: "Biz", owner_name: "", email: "", phone: "", address: "", market: "US", currency: "USD", date_format: "MM/DD/YYYY", timezone: "America/Chicago", default_hourly_cost: "20", default_target_margin_percent: "35", quote_prefix: "EST-", invoice_prefix: "INV-", invoice_footer: "", payment_terms_days: "14" },
  ],
  ["quote", quoteSchema, { client_id: uuid, service_type: "deep", issue_date: "2026-01-02", valid_until: "", notes: "", items: [{ description: "Deep clean", quantity: "1", unit_price: "199.999" }] }],
  ["pricing", pricingSchema, { client_id: uuid, service_type: "standard", hours: "3", hourlyLabourCost: "20", cleaners: "2", supplies: "8", travel: "6", otherCosts: "0", targetMarginPercent: "35", manualPrice: "" }],
  ["job", jobSchema, { client_id: uuid, service_type: "standard", scheduled_date: "2026-02-01", start_time: "09:30", duration_minutes: "180", price: "120", execution_notes: "", checklist_slug: "standard-cleaning-checklist" }],
  ["invoice", invoiceSchema, { client_id: uuid, job_id: "", issue_date: "2026-02-01", due_date: "2026-02-15", status: "issued", notes: "", items: [{ description: "Clean", quantity: "1", unit_price: "120" }] }],
  ["payment", paymentSchema, { invoice_id: uuid, amount: "50.5", paid_on: "2026-02-02", method: "cash", reference: "", notes: "" }],
  ["expense", expenseSchema, { spent_on: "2026-02-02", category: "supplies", description: "Cloths", amount: "12.345" }],
];

describe("validation schemas", () => {
  it.each(cases)("%s: accepts raw form input and its own output (client → server re-validation)", (_name, schema, input) => {
    const first = schema.safeParse(input);
    expect(first.success, JSON.stringify(first.error?.issues)).toBe(true);
    const second = schema.safeParse(first.data);
    expect(second.success, JSON.stringify(second.error?.issues)).toBe(true);
    expect(second.data).toEqual(first.data);
  });

  it("normalises empty optional fields to null and rounds money", () => {
    const c = clientSchema.parse({ name: " Jordan ", email: "", phone: undefined });
    expect(c).toMatchObject({ name: "Jordan", email: null, phone: null });
    expect(expenseSchema.parse(cases[8][2]).amount).toBe(12.35);
    expect(quoteSchema.parse(cases[3][2]).items[0].unit_price).toBe(200);
  });

  it("rejects invalid input with helpful messages", () => {
    expect(clientSchema.safeParse({ name: "" }).error?.issues[0].message).toBe("Client name is required.");
    expect(clientSchema.safeParse({ name: "A", email: "nope" }).error?.issues[0].message).toBe("Enter a valid email address.");
    expect(paymentSchema.safeParse({ ...cases[7][2], amount: "0" }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...cases[6][2], due_date: "2026-01-01" }).error?.issues[0].message).toMatch(/on or after/);
    expect(quoteSchema.safeParse({ ...cases[3][2], items: [] }).error?.issues[0].message).toBe("Add at least one line item.");
    expect(pricingSchema.safeParse({ ...cases[4][2], targetMarginPercent: "100" }).success).toBe(false);
    expect(jobSchema.safeParse({ ...cases[5][2], start_time: "25:00" }).success).toBe(false);
    expect(jobSchema.safeParse({ ...cases[5][2], scheduled_date: "2026-02-30" }).success).toBe(false);
  });
});
