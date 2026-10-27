import { z } from "zod";
import { DEFAULT_SETTINGS, UNITS } from "./types";

const unit = z.enum(UNITS as [string, ...string[]]) as z.ZodType<import("./types").Unit>;
const cents = z.number().int().min(0).max(100_000_000);
const pct = (max = 100) => z.number().min(0).max(max);
const isoDate = z.string().min(1);

export const pricePointSchema = z.object({
  date: isoDate,
  pricePaidCents: cents,
  purchaseQuantity: z.number().positive(),
  purchaseUnit: unit,
});

export const ingredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  category: z.string().max(60).default(""),
  purchaseQuantity: z.number().positive(),
  purchaseUnit: unit,
  pricePaidCents: cents,
  supplier: z.string().max(120).default(""),
  densityGPerMl: z.number().positive().max(10).nullable().default(null),
  notes: z.string().max(1000).default(""),
  isDemo: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
  priceHistory: z.array(pricePointSchema).default([]),
});

export const recipeItemSchema = z.object({
  id: z.string().min(1),
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unit,
});

export const extraCostSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["packaging", "other"]),
  label: z.string().max(120).default(""),
  amountCents: cents,
  basis: z.enum(["batch", "unit"]),
});

export const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  category: z.string().max(60).default(""),
  yieldQuantity: z.number().positive(),
  yieldUnit: z.string().max(30).default("porzioni"),
  items: z.array(recipeItemSchema).default([]),
  laborMinutes: z.number().min(0).max(100_000).default(0),
  laborHourlyRateCents: cents.default(0),
  extraCosts: z.array(extraCostSchema).default([]),
  wastePercent: z.number().min(0).max(99).default(0),
  targetMarginPercent: z.number().min(0).lt(100).nullable().default(null),
  currentPriceCents: cents.nullable().default(null),
  notes: z.string().max(2000).default(""),
  isDemo: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const settingsSchema = z.object({
  businessName: z.string().max(120).default(""),
  currency: z.literal("EUR").default("EUR"),
  locale: z.literal("it").default("it"),
  defaultMarginPercent: z.number().min(0).lt(100).default(DEFAULT_SETTINGS.defaultMarginPercent),
  defaultHourlyRateCents: cents.default(DEFAULT_SETTINGS.defaultHourlyRateCents),
  defaultFeePercent: z.number().min(0).lt(100).default(0),
  vatPercent: pct(100).default(0),
  defaultFixedCostPerBatchCents: cents.default(0),
  roundingStepCents: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(50), z.literal(100)]).default(10),
  roundingMode: z.enum(["up", "nearest"]).default("up"),
  lastBackupAt: z.string().nullable().default(null),
});

export const appDataSchema = z.object({
  ingredients: z.array(ingredientSchema),
  recipes: z.array(recipeSchema),
  settings: settingsSchema,
});

export const BACKUP_APP_ID = "sweetprofit";
export const BACKUP_SCHEMA_VERSION = 1;

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  data: appDataSchema,
});

export type BackupFile = z.infer<typeof backupSchema>;
