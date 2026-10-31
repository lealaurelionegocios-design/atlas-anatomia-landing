import { describe, expect, it } from "vitest";
import { formatMoney, lineAmount, sumMoney, toCents } from "@/lib/money";
import { addDays, addMonths, formatDate, formatTime, isIsoDate, monthsBetween, periodRange, todayIn } from "@/lib/dates";

describe("money", () => {
  it("converts to cents without float drift", () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-2.5)).toBe(-250);
    expect(toCents(null)).toBe(0);
    expect(() => toCents("abc")).toThrow();
  });
  it("sums and multiplies in cents", () => {
    expect(sumMoney([0.1, 0.2, "0.3"])).toBe(0.6);
    expect(lineAmount(3, 33.335)).toBe(100.01);
  });
  it("formats by market", () => {
    expect(formatMoney(1234.5, "USD", "US")).toBe("$1,234.50");
    expect(formatMoney(1234.5, "GBP", "UK")).toBe("£1,234.50");
    expect(formatMoney("0", "GBP")).toBe("£0.00");
  });
});

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("02/03/2026")).toBe(false);
  });
  it("formats US and UK dates", () => {
    expect(formatDate("2026-03-04", "MM/DD/YYYY")).toBe("03/04/2026");
    expect(formatDate("2026-03-04", "DD/MM/YYYY")).toBe("04/03/2026");
    expect(formatDate("2026-03-04", "YYYY-MM-DD")).toBe("2026-03-04");
    expect(formatDate(null, "MM/DD/YYYY")).toBe("—");
  });
  it("formats times (12h US, 24h UK)", () => {
    expect(formatTime("09:05:00", "US")).toBe("9:05 AM");
    expect(formatTime("13:30", "US")).toBe("1:30 PM");
    expect(formatTime("00:15", "US")).toBe("12:15 AM");
    expect(formatTime("13:30", "UK")).toBe("13:30");
  });
  it("does calendar arithmetic", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthsBetween("2026-01-15", "2026-04-02")).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });
  it("computes reporting periods", () => {
    expect(periodRange("this_month", "2026-10-31")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("this_quarter", "2026-11-15")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(periodRange("year_to_date", "2026-10-31")).toEqual({ from: "2026-01-01", to: "2026-10-31" });
    expect(periodRange("last_30_days", "2026-10-31")).toEqual({ from: "2026-10-02", to: "2026-10-31" });
    expect(periodRange("last_12_months", "2026-10-31")).toEqual({ from: "2025-11-01", to: "2026-10-31" });
    expect(periodRange("all_time", "2026-10-31")).toEqual({ from: null, to: null });
    expect(periodRange("custom", "2026-10-31", { from: "2026-05-01", to: "2026-04-01" })).toEqual({ from: "2026-04-01", to: "2026-05-01" });
  });
  it("computes today in a timezone", () => {
    const instant = new Date("2026-06-01T02:30:00Z");
    expect(todayIn("Europe/London", instant)).toBe("2026-06-01");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-05-31");
    expect(todayIn("Not/AZone", instant)).toBe("2026-06-01");
  });
});
