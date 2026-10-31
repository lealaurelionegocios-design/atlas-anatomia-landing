import { fromCents, toCents } from "./money";

// Smart Cleaning Pricing Calculator
//   Labour          = estimated hours × hourly labour cost × number of cleaners
//   Total Costs     = Labour + Supplies + Travel + Other Costs
//   Suggested Price = Total Costs / (1 − Target Gross Margin)
// The margin is a decimal in [0, 1). No tax is ever added here.

export interface PricingInput {
  hours: number;
  hourlyLabourCost: number;
  cleaners: number;
  supplies: number;
  travel: number;
  otherCosts: number;
  /** Decimal between 0 (inclusive) and 1 (exclusive), e.g. 0.35 for 35 %. */
  targetMargin: number;
  /** Optional price the owner wants to charge instead of the suggestion. */
  manualPrice?: number | null;
}

export interface PricingResult {
  labour: number;
  supplies: number;
  travel: number;
  otherCosts: number;
  totalCosts: number;
  targetMargin: number;
  suggestedPrice: number;
  finalPrice: number;
  usesManualPrice: boolean;
  /** Final price − total costs. */
  grossContribution: number;
  /** Gross contribution / final price (0 when price is 0). */
  actualMargin: number;
  /** Effective revenue per cleaner-hour at the final price. */
  revenuePerCleanerHour: number;
  warnings: PricingWarning[];
}

export type PricingWarning = { code: string; message: string; severity: "info" | "warning" | "danger" };

export type PricingErrors = Partial<Record<keyof PricingInput, string>>;

export type PricingOutcome = { ok: true; result: PricingResult } | { ok: false; errors: PricingErrors };

export const PRICING_LIMITS = {
  maxHours: 24,
  maxCleaners: 20,
  maxHourly: 1000,
  maxCost: 100000,
  maxMargin: 0.95,
} as const;

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function validatePricingInput(input: Partial<Record<keyof PricingInput, unknown>>): PricingErrors {
  const errors: PricingErrors = {};
  const { hours, hourlyLabourCost, cleaners, supplies, travel, otherCosts, targetMargin, manualPrice } = input;

  if (!isNum(hours) || hours <= 0) errors.hours = "Enter the estimated hours (greater than 0).";
  else if (hours > PRICING_LIMITS.maxHours) errors.hours = `Hours per cleaner cannot exceed ${PRICING_LIMITS.maxHours}.`;

  if (!isNum(hourlyLabourCost) || hourlyLabourCost < 0) errors.hourlyLabourCost = "Enter an hourly cost of 0 or more.";
  else if (hourlyLabourCost > PRICING_LIMITS.maxHourly) errors.hourlyLabourCost = "That hourly cost looks too high.";

  if (!isNum(cleaners) || !Number.isInteger(cleaners) || cleaners < 1) errors.cleaners = "Use a whole number of cleaners (1 or more).";
  else if (cleaners > PRICING_LIMITS.maxCleaners) errors.cleaners = `At most ${PRICING_LIMITS.maxCleaners} cleaners.`;

  for (const key of ["supplies", "travel", "otherCosts"] as const) {
    const v = { supplies, travel, otherCosts }[key];
    if (!isNum(v) || v < 0) errors[key] = "Enter 0 or a positive amount.";
    else if (v > PRICING_LIMITS.maxCost) errors[key] = "That amount looks too high.";
  }

  if (!isNum(targetMargin) || targetMargin < 0 || targetMargin >= 1) {
    errors.targetMargin = "Target margin must be at least 0% and below 100%.";
  } else if (targetMargin > PRICING_LIMITS.maxMargin) {
    errors.targetMargin = `Target margin cannot exceed ${PRICING_LIMITS.maxMargin * 100}%.`;
  }

  if (manualPrice !== undefined && manualPrice !== null) {
    if (!isNum(manualPrice) || manualPrice < 0) errors.manualPrice = "Manual price must be 0 or more.";
    else if (manualPrice > PRICING_LIMITS.maxCost * 10) errors.manualPrice = "That price looks too high.";
  }
  return errors;
}

/** Round half up to whole cents, tolerant of floating-point noise. */
function roundCents(x: number): number {
  return Math.round(x + Math.sign(x) * 1e-7);
}

export function calculatePrice(input: PricingInput): PricingOutcome {
  const errors = validatePricingInput(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const labourC = toCents(input.hours * input.hourlyLabourCost * input.cleaners);
  const suppliesC = toCents(input.supplies);
  const travelC = toCents(input.travel);
  const otherC = toCents(input.otherCosts);
  const totalC = labourC + suppliesC + travelC + otherC;

  const suggestedC = roundCents(totalC / (1 - input.targetMargin));
  const usesManual = input.manualPrice !== undefined && input.manualPrice !== null;
  const finalC = usesManual ? toCents(input.manualPrice as number) : suggestedC;
  const contributionC = finalC - totalC;
  const actualMargin = finalC > 0 ? Math.round((contributionC / finalC) * 10000) / 10000 : 0;
  const cleanerHours = input.hours * input.cleaners;

  const warnings: PricingWarning[] = [];
  if (input.hourlyLabourCost === 0) {
    warnings.push({
      code: "no_labour",
      severity: "warning",
      message: "Labour cost is 0. Include what you pay yourself or your team, even if you work alone.",
    });
  }
  if (input.supplies === 0) {
    warnings.push({ code: "no_supplies", severity: "info", message: "No supplies cost entered. Products, cloths and bags add up over time." });
  }
  if (input.travel === 0) {
    warnings.push({ code: "no_travel", severity: "info", message: "No travel cost entered. Consider fuel, parking, tolls or public transport." });
  }
  warnings.push({
    code: "overheads",
    severity: "info",
    message: "Overheads such as insurance, equipment wear, software and admin time are not included unless you add them to Other Costs.",
  });
  if (input.targetMargin === 0 && !usesManual) {
    warnings.push({ code: "zero_margin", severity: "warning", message: "A 0% margin only covers the costs you entered and leaves nothing for the business." });
  }
  if (input.targetMargin > 0.7) {
    warnings.push({ code: "high_margin", severity: "info", message: "Margins above 70% are unusual for residential cleaning. Check the price against your local market." });
  }
  if (usesManual && contributionC < 0) {
    warnings.push({ code: "below_cost", severity: "danger", message: "The manual price is below your estimated costs. This job would lose money." });
  } else if (usesManual && finalC > 0 && contributionC / finalC < input.targetMargin - 0.00005) {
    warnings.push({ code: "below_target", severity: "warning", message: "The manual price gives a margin below your target." });
  }
  if (totalC === 0) {
    warnings.push({ code: "no_costs", severity: "warning", message: "All costs are 0, so the suggested price is 0. Add your real costs." });
  }

  return {
    ok: true,
    result: {
      labour: fromCents(labourC),
      supplies: fromCents(suppliesC),
      travel: fromCents(travelC),
      otherCosts: fromCents(otherC),
      totalCosts: fromCents(totalC),
      targetMargin: input.targetMargin,
      suggestedPrice: fromCents(suggestedC),
      finalPrice: fromCents(finalC),
      usesManualPrice: usesManual,
      grossContribution: fromCents(contributionC),
      actualMargin,
      revenuePerCleanerHour: cleanerHours > 0 ? fromCents(roundCents(finalC / cleanerHours)) : 0,
      warnings,
    },
  };
}

/** Converts a percentage entered by a user (e.g. "35") into a decimal margin (0.35). */
export function percentToMargin(percent: number): number {
  return Math.round((percent / 100) * 10000) / 10000;
}

export function marginToPercent(margin: number): number {
  return Math.round(margin * 10000) / 100;
}
