import { describe, expect, it } from "vitest";
import { calculatePrice, marginToPercent, percentToMargin, validatePricingInput, type PricingInput } from "@/lib/pricing";

const base: PricingInput = {
  hours: 3,
  hourlyLabourCost: 20,
  cleaners: 2,
  supplies: 8,
  travel: 6,
  otherCosts: 0,
  targetMargin: 0.35,
};

function ok(input: PricingInput) {
  const out = calculatePrice(input);
  if (!out.ok) throw new Error(JSON.stringify(out.errors));
  return out.result;
}

describe("calculatePrice — formula", () => {
  it("computes labour, total costs and suggested price = costs / (1 − margin)", () => {
    const r = ok(base);
    expect(r.labour).toBe(120); // 3 h × 20 × 2 cleaners
    expect(r.totalCosts).toBe(134); // 120 + 8 + 6 + 0
    expect(r.suggestedPrice).toBe(206.15); // 134 / 0.65 = 206.1538…
    expect(r.finalPrice).toBe(206.15);
    expect(r.grossContribution).toBe(72.15);
    expect(r.actualMargin).toBeCloseTo(0.35, 3);
    expect(r.usesManualPrice).toBe(false);
  });

  it("returns the costs unchanged at 0% margin", () => {
    const r = ok({ ...base, targetMargin: 0 });
    expect(r.suggestedPrice).toBe(134);
    expect(r.grossContribution).toBe(0);
    expect(r.warnings.map((w) => w.code)).toContain("zero_margin");
  });

  it("doubles costs at a 50% margin", () => {
    expect(ok({ ...base, targetMargin: 0.5 }).suggestedPrice).toBe(268);
  });

  it("rounds half up to cents", () => {
    // 10 / (1 - 0.2) = 12.5 exactly; 1 / 0.7 = 1.428571… → 1.43; 2/0.3 = 6.666… → 6.67
    expect(ok({ ...base, hours: 1, hourlyLabourCost: 10, cleaners: 1, supplies: 0, travel: 0, targetMargin: 0.2 }).suggestedPrice).toBe(12.5);
    expect(ok({ ...base, hours: 1, hourlyLabourCost: 1, cleaners: 1, supplies: 0, travel: 0, targetMargin: 0.3 }).suggestedPrice).toBe(1.43);
    expect(ok({ ...base, hours: 1, hourlyLabourCost: 2, cleaners: 1, supplies: 0, travel: 0, targetMargin: 0.7 }).suggestedPrice).toBe(6.67);
  });

  it("avoids floating point artefacts in cost sums", () => {
    const r = ok({ ...base, hours: 1, hourlyLabourCost: 0.1, cleaners: 1, supplies: 0.2, travel: 0, otherCosts: 0, targetMargin: 0 });
    expect(r.totalCosts).toBe(0.3);
  });

  it("handles fractional hours", () => {
    const r = ok({ ...base, hours: 2.75, hourlyLabourCost: 18.5, cleaners: 1, supplies: 0, travel: 0 });
    expect(r.labour).toBe(50.88); // 50.875 → 50.88
  });

  it("all-zero costs give a zero price and a warning", () => {
    const r = ok({ ...base, hourlyLabourCost: 0, supplies: 0, travel: 0, otherCosts: 0 });
    expect(r.suggestedPrice).toBe(0);
    expect(r.actualMargin).toBe(0);
    const codes = r.warnings.map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(["no_costs", "no_labour", "no_supplies", "no_travel"]));
  });

  it("supports a manual price and reports the real margin", () => {
    const r = ok({ ...base, manualPrice: 180 });
    expect(r.usesManualPrice).toBe(true);
    expect(r.finalPrice).toBe(180);
    expect(r.suggestedPrice).toBe(206.15);
    expect(r.grossContribution).toBe(46);
    expect(r.actualMargin).toBeCloseTo(0.2556, 4);
    expect(r.warnings.map((w) => w.code)).toContain("below_target");
  });

  it("flags a manual price below cost", () => {
    const r = ok({ ...base, manualPrice: 100 });
    expect(r.grossContribution).toBe(-34);
    expect(r.warnings.find((w) => w.code === "below_cost")?.severity).toBe("danger");
  });

  it("accepts a manual price of 0", () => {
    const r = ok({ ...base, manualPrice: 0 });
    expect(r.finalPrice).toBe(0);
    expect(r.actualMargin).toBe(0);
  });

  it("does not warn below target when manual price meets the target", () => {
    const r = ok({ ...base, manualPrice: 206.15 });
    expect(r.warnings.map((w) => w.code)).not.toContain("below_target");
  });

  it("never adds tax", () => {
    const r = ok(base);
    expect(r.finalPrice).toBe(r.suggestedPrice);
    expect(Object.keys(r)).not.toContain("tax");
  });

  it("computes revenue per cleaner-hour", () => {
    expect(ok(base).revenuePerCleanerHour).toBe(34.36); // 206.15 / 6
  });

  it("handles extreme but valid values", () => {
    const r = ok({ hours: 24, hourlyLabourCost: 1000, cleaners: 20, supplies: 100000, travel: 100000, otherCosts: 100000, targetMargin: 0.95 });
    expect(r.labour).toBe(480000);
    expect(r.totalCosts).toBe(780000);
    expect(r.suggestedPrice).toBe(15600000);
  });
});

describe("calculatePrice — validation", () => {
  it.each([
    ["margin of 1 (division by zero)", { targetMargin: 1 }, "targetMargin"],
    ["margin above 1", { targetMargin: 1.5 }, "targetMargin"],
    ["negative margin", { targetMargin: -0.1 }, "targetMargin"],
    ["margin above the 95% cap", { targetMargin: 0.96 }, "targetMargin"],
    ["NaN margin", { targetMargin: Number.NaN }, "targetMargin"],
    ["zero hours", { hours: 0 }, "hours"],
    ["too many hours", { hours: 25 }, "hours"],
    ["negative hourly cost", { hourlyLabourCost: -5 }, "hourlyLabourCost"],
    ["infinite hourly cost", { hourlyLabourCost: Number.POSITIVE_INFINITY }, "hourlyLabourCost"],
    ["fractional cleaners", { cleaners: 1.5 }, "cleaners"],
    ["zero cleaners", { cleaners: 0 }, "cleaners"],
    ["negative supplies", { supplies: -1 }, "supplies"],
    ["negative travel", { travel: -1 }, "travel"],
    ["string other costs", { otherCosts: "10" as unknown as number }, "otherCosts"],
    ["negative manual price", { manualPrice: -1 }, "manualPrice"],
  ])("rejects %s", (_label, patch, field) => {
    const out = calculatePrice({ ...base, ...(patch as Partial<PricingInput>) });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(Object.keys(out.errors)).toContain(field);
  });

  it("reports every invalid field at once", () => {
    const errors = validatePricingInput({});
    expect(Object.keys(errors).sort()).toEqual(["cleaners", "hourlyLabourCost", "hours", "otherCosts", "supplies", "targetMargin", "travel"].sort());
  });
});

describe("margin conversions", () => {
  it("converts percentages to decimals and back", () => {
    expect(percentToMargin(35)).toBe(0.35);
    expect(percentToMargin(12.5)).toBe(0.125);
    expect(marginToPercent(0.35)).toBe(35);
    expect(marginToPercent(0.3333)).toBe(33.33);
  });
});
