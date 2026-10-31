import { describe, expect, it } from "vitest";
import { computeDashboard, invoiceBalance, invoicePaymentStatus, type DashboardInput } from "@/lib/finance";

const today = "2026-10-15";

describe("invoice payment status", () => {
  const inv = { status: "issued", total: 100, due_date: "2026-10-20" };
  it("derives Unpaid / Partially Paid / Paid / Overdue", () => {
    expect(invoicePaymentStatus({ ...inv, paid: 0 }, today)).toBe("unpaid");
    expect(invoicePaymentStatus({ ...inv, paid: 40 }, today)).toBe("partially_paid");
    expect(invoicePaymentStatus({ ...inv, paid: 100 }, today)).toBe("paid");
    expect(invoicePaymentStatus({ ...inv, paid: 40, due_date: "2026-10-14" }, today)).toBe("overdue");
    expect(invoicePaymentStatus({ ...inv, paid: 0, due_date: "2026-10-15" }, today)).toBe("unpaid");
    expect(invoicePaymentStatus({ ...inv, status: "draft" }, today)).toBe("draft");
    expect(invoicePaymentStatus({ ...inv, status: "void" }, today)).toBe("void");
  });
  it("computes balance in cents", () => {
    expect(invoiceBalance({ ...inv, total: "100.10", paid: "33.37" })).toBe(66.73);
    expect(invoiceBalance({ ...inv, paid: 150 })).toBe(0);
  });
});

describe("dashboard metrics", () => {
  const input: DashboardInput = {
    currency: "USD",
    today,
    range: { from: "2026-10-01", to: "2026-10-31" },
    clients: [{ archived_at: null }, { archived_at: null }, { archived_at: "2026-01-01" }],
    jobs: [
      { status: "scheduled", scheduled_date: "2026-10-20", price: 150, currency: "USD" },
      { status: "in_progress", scheduled_date: "2026-10-15", price: 150, currency: "USD" },
      { status: "scheduled", scheduled_date: "2026-10-10", price: 150, currency: "USD" }, // past, still scheduled
      { status: "completed", scheduled_date: "2026-10-05", price: 200, currency: "USD" },
      { status: "completed", scheduled_date: "2026-09-05", price: 200, currency: "USD" },
      { status: "cancelled", scheduled_date: "2026-10-25", price: 200, currency: "USD" },
    ],
    quotes: [
      { status: "accepted", total: 200, currency: "USD", accepted_at: "2026-10-02T10:00:00Z", issue_date: "2026-10-01" },
      { status: "sent", total: 999, currency: "USD", accepted_at: null, issue_date: "2026-10-01" },
    ],
    invoices: [
      { status: "issued", total: 200, paid: 200, due_date: "2026-10-19", currency: "USD", issue_date: "2026-10-05" },
      { status: "issued", total: 150, paid: 50, due_date: "2026-10-01", currency: "USD", issue_date: "2026-09-20" },
      { status: "issued", total: 80, paid: 0, due_date: "2026-10-30", currency: "USD", issue_date: "2026-10-10" },
      { status: "draft", total: 500, paid: 0, due_date: "2026-10-30", currency: "USD", issue_date: "2026-10-10" },
      { status: "void", total: 500, paid: 0, due_date: "2026-10-30", currency: "USD", issue_date: "2026-10-10" },
    ],
    payments: [
      { amount: 200, currency: "USD", paid_on: "2026-10-06" },
      { amount: 50, currency: "USD", paid_on: "2026-09-25" },
      { amount: 70, currency: "GBP", paid_on: "2026-10-06" },
    ],
    expenses: [
      { amount: 30.5, currency: "USD", spent_on: "2026-10-03" },
      { amount: 12, currency: "USD", spent_on: "2026-09-03" },
    ],
  };

  const m = computeDashboard(input);

  it("counts clients and jobs", () => {
    expect(m.totalClients).toBe(2);
    expect(m.upcomingJobs).toBe(2);
    expect(m.completedJobs).toBe(1);
  });
  it("keeps received, invoiced, quoted and outstanding separate", () => {
    expect(m.revenueReceived).toBe(200);
    expect(m.invoicedInPeriod).toBe(280);
    expect(m.acceptedQuoteValue).toBe(200);
    expect(m.outstandingPayments).toBe(180); // 100 overdue + 80 unpaid
    expect(m.overdueAmount).toBe(100);
    expect(m.overdueInvoices).toBe(1);
  });
  it("estimates net operating surplus = received − expenses in period", () => {
    expect(m.expenses).toBe(30.5);
    expect(m.estimatedNetOperatingSurplus).toBe(169.5);
  });
  it("excludes and counts records in another currency", () => {
    expect(m.otherCurrencyRecords).toBe(1);
  });
  it("builds a monthly series for the range", () => {
    expect(m.monthly).toEqual([{ month: "2026-10", received: 200, expenses: 30.5, surplus: 169.5 }]);
  });
  it("uses the last 6 months for open ranges", () => {
    const all = computeDashboard({ ...input, range: { from: null, to: null } });
    expect(all.monthly.map((p) => p.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(all.revenueReceived).toBe(250);
    expect(all.monthly.find((p) => p.month === "2026-09")).toEqual({ month: "2026-09", received: 50, expenses: 12, surplus: 38 });
  });
});
