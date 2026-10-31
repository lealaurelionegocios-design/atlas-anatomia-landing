import { z } from "zod";
import { isIsoDate } from "./dates";
import { CURRENCIES, DATE_FORMATS, EXPENSE_CATEGORIES, JOB_STATUSES, MARKETS, PAYMENT_METHODS, QUOTE_STATUSES, SERVICE_TYPES } from "./market";

// Shared by client forms (react-hook-form) and server actions. The server
// always re-validates: never trust the browser.

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`);
const requiredText = (max: number, label: string) => text(max).min(1, `${label} is required.`);
// Optional fields accept "", undefined or null and normalise to null. Schemas
// must accept their own output: react-hook-form submits transformed values and
// the server action validates them again.
const optionalText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .nullish()
  .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address.")
  .transform((v) => (v ? v.toLowerCase() : null));

const isoDate = (label = "Date") => z.string().refine(isIsoDate, `${label} must be a valid date.`);
const optionalIsoDate = z
  .string()
  .nullish()
  .refine((v) => !v || isIsoDate(v), "Enter a valid date.")
  .transform((v) => (v ? v : null));

const money = (label: string, { min = 0, max = 1_000_000 } = {}) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .refine(Number.isFinite, `${label} must be a number.`)
    .min(min, min > 0 ? `${label} must be greater than 0.` : `${label} cannot be negative.`)
    .max(max, `${label} is too large.`)
    .transform((n) => Math.round(n * 100) / 100);

const uuid = (label: string) => z.uuid({ error: `Choose a ${label}.` });

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Enter a valid time.");

// ---------------------------------------------------------------------------

export const clientSchema = z.object({
  name: requiredText(120, "Client name"),
  email: optionalEmail,
  phone: optionalText(40),
  address_line1: optionalText(200),
  address_line2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postal_code: optionalText(20),
  service_preferences: optionalText(2000),
  notes: optionalText(4000),
});
export type ClientInput = z.input<typeof clientSchema>;

export const businessSettingsSchema = z.object({
  name: requiredText(120, "Business name"),
  owner_name: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(400),
  market: z.enum(MARKETS),
  currency: z.enum(CURRENCIES),
  date_format: z.enum(DATE_FORMATS),
  timezone: z.string().trim().min(1).max(64),
  default_hourly_cost: money("Hourly labour cost", { max: 1000 }),
  default_target_margin_percent: z.coerce
    .number({ error: "Target margin must be a number." })
    .min(0, "Target margin cannot be negative.")
    .max(95, "Target margin cannot exceed 95%."),
  quote_prefix: z.string().trim().regex(/^[A-Za-z0-9/_-]{0,12}$/, "Use up to 12 letters, numbers, - _ or /."),
  invoice_prefix: z.string().trim().regex(/^[A-Za-z0-9/_-]{0,12}$/, "Use up to 12 letters, numbers, - _ or /."),
  invoice_footer: optionalText(600),
  payment_terms_days: z.coerce.number().int("Use whole days.").min(0).max(120, "Use 120 days or fewer."),
  confirm_currency_change: z.boolean().optional(),
});
export type BusinessSettingsInput = z.input<typeof businessSettingsSchema>;

export const onboardingBusinessSchema = z.object({
  name: requiredText(120, "Business name"),
  owner_name: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(400),
  market: z.enum(MARKETS),
  timezone: z.string().trim().min(1).max(64),
  default_hourly_cost: money("Hourly labour cost", { max: 1000 }),
  default_target_margin_percent: z.coerce.number().min(0).max(95, "Target margin cannot exceed 95%."),
});
export type OnboardingBusinessInput = z.input<typeof onboardingBusinessSchema>;

export const lineItemSchema = z.object({
  description: requiredText(300, "Description"),
  quantity: z.coerce
    .number({ error: "Quantity must be a number." })
    .gt(0, "Quantity must be greater than 0.")
    .max(10000, "Quantity is too large.")
    .transform((n) => Math.round(n * 100) / 100),
  unit_price: money("Unit price"),
});

export const quoteSchema = z.object({
  client_id: uuid("client"),
  service_type: z.enum(SERVICE_TYPES),
  issue_date: isoDate("Issue date"),
  valid_until: optionalIsoDate,
  notes: optionalText(4000),
  items: z.array(lineItemSchema).min(1, "Add at least one line item.").max(50, "Use 50 line items or fewer."),
}).refine((q) => !q.valid_until || q.valid_until >= q.issue_date, { path: ["valid_until"], message: "Valid-until date must be on or after the issue date." });
export type QuoteInput = z.input<typeof quoteSchema>;

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

export const pricingSchema = z.object({
  client_id: z.string().optional(),
  service_type: z.enum(SERVICE_TYPES),
  hours: z.coerce.number({ error: "Enter the hours." }).gt(0, "Hours must be greater than 0.").max(24, "Use 24 hours or fewer per cleaner."),
  hourlyLabourCost: money("Hourly cost", { max: 1000 }),
  cleaners: z.coerce.number().int("Use a whole number.").min(1, "At least 1 cleaner.").max(20, "At most 20 cleaners."),
  supplies: money("Supplies", { max: 100000 }),
  travel: money("Travel", { max: 100000 }),
  otherCosts: money("Other costs", { max: 100000 }),
  targetMarginPercent: z.coerce.number({ error: "Enter a margin." }).min(0, "Margin cannot be negative.").max(95, "Margin cannot exceed 95%."),
  manualPrice: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000)])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : Math.round(v * 100) / 100)),
});
export type PricingFormInput = z.input<typeof pricingSchema>;

export const convertQuoteSchema = z.object({
  quote_id: uuid("quote"),
  scheduled_date: isoDate("Date"),
  start_time: timeSchema,
  duration_minutes: z.coerce.number().int().min(15, "At least 15 minutes.").max(1440, "At most 24 hours."),
  checklist_slug: z.string().max(60),
});

export const jobSchema = z.object({
  client_id: uuid("client"),
  service_type: z.enum(SERVICE_TYPES),
  scheduled_date: isoDate("Date"),
  start_time: timeSchema,
  duration_minutes: z.coerce.number().int().min(15, "At least 15 minutes.").max(1440, "At most 24 hours."),
  price: money("Price"),
  execution_notes: optionalText(4000),
  checklist_slug: z.string().max(60),
});
export type JobInput = z.input<typeof jobSchema>;

export const jobUpdateSchema = z.object({
  scheduled_date: isoDate("Date"),
  start_time: timeSchema,
  duration_minutes: z.coerce.number().int().min(15).max(1440),
  price: money("Price"),
  execution_notes: optionalText(4000),
});

export const jobStatusSchema = z.enum(JOB_STATUSES);

export const invoiceSchema = z.object({
  client_id: uuid("client"),
  job_id: z
    .union([z.uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  issue_date: isoDate("Issue date"),
  due_date: isoDate("Due date"),
  status: z.enum(["draft", "issued"]),
  notes: optionalText(4000),
  items: z.array(lineItemSchema).min(1, "Add at least one line item.").max(50),
}).refine((i) => i.due_date >= i.issue_date, { path: ["due_date"], message: "Due date must be on or after the issue date." });
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const paymentSchema = z.object({
  invoice_id: uuid("invoice"),
  amount: money("Amount", { min: 0.01 }),
  paid_on: isoDate("Payment date"),
  method: z.enum(PAYMENT_METHODS),
  reference: optionalText(120),
  notes: optionalText(1000),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const expenseSchema = z.object({
  spent_on: isoDate("Date"),
  category: z.enum(EXPENSE_CATEGORIES),
  description: requiredText(200, "Description"),
  amount: money("Amount", { min: 0.01 }),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const documentOverridesSchema = z.record(z.string().regex(/^[a-z0-9-]{1,60}$/), z.string().max(4000)).refine(
  (r) => Object.keys(r).length <= 40,
  "Too many fields.",
);

export const logoSchema = z
  .string()
  .max(400000, "Logo must be smaller than about 280 KB.")
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Logo must be a PNG, JPEG or WebP image.");

export const signUpSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
});
export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
