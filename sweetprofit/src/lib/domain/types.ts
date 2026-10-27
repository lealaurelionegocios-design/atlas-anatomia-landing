/**
 * Modello dati di SweetProfit.
 *
 * Convenzioni:
 * - Gli importi inseriti dall'utente sono salvati in centesimi di euro (interi).
 * - Le quantità sono numeri decimali nella loro unità (es. 0,5 kg).
 * - Le percentuali sono salvate come numeri "per cento" (50 = 50%).
 * - Le date sono stringhe ISO 8601.
 */

export type Unit = "g" | "kg" | "ml" | "l" | "pz";
export type Dimension = "mass" | "volume" | "count";
export type BaseUnit = "g" | "ml" | "pz";

export const UNITS: Unit[] = ["g", "kg", "ml", "l", "pz"];

export interface PricePoint {
  date: string;
  pricePaidCents: number;
  purchaseQuantity: number;
  purchaseUnit: Unit;
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: Unit;
  pricePaidCents: number;
  supplier: string;
  /** Densità in g/ml. Necessaria solo per convertire peso ↔ volume. */
  densityGPerMl: number | null;
  notes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  /** Prezzi precedenti (il prezzo attuale NON è incluso). */
  priceHistory: PricePoint[];
}

export interface RecipeItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: Unit;
}

export type CostBasis = "batch" | "unit";
export type CostKind = "packaging" | "other";

export interface ExtraCost {
  id: string;
  kind: CostKind;
  label: string;
  amountCents: number;
  /** "batch" = importo per l'intera ricetta, "unit" = importo per ogni unità prodotta. */
  basis: CostBasis;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  yieldQuantity: number;
  yieldUnit: string;
  items: RecipeItem[];
  laborMinutes: number;
  laborHourlyRateCents: number;
  extraCosts: ExtraCost[];
  /** Maggiorazione percentuale sul costo ingredienti per scarti e perdite. */
  wastePercent: number;
  /** Margine obiettivo; null = usa il margine predefinito delle impostazioni. */
  targetMarginPercent: number | null;
  /** Prezzo di vendita attuale al cliente per unità (IVA inclusa se applicata). */
  currentPriceCents: number | null;
  notes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RoundingStep = 1 | 5 | 10 | 50 | 100; // in centesimi
export type RoundingMode = "up" | "nearest";

export interface Settings {
  businessName: string;
  currency: "EUR";
  locale: "it";
  defaultMarginPercent: number;
  defaultHourlyRateCents: number;
  /** Commissioni (POS, piattaforme) in % sul prezzo pagato dal cliente. */
  defaultFeePercent: number;
  /** Aliquota IVA applicata ai prezzi di vendita (0 se non applicabile). */
  vatPercent: number;
  /** Quota di costi fissi (affitto, utenze…) da attribuire a ogni ricetta prodotta. */
  defaultFixedCostPerBatchCents: number;
  roundingStepCents: RoundingStep;
  roundingMode: RoundingMode;
  lastBackupAt: string | null;
}

export interface AppData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: "",
  currency: "EUR",
  locale: "it",
  defaultMarginPercent: 50,
  defaultHourlyRateCents: 1200,
  defaultFeePercent: 0,
  vatPercent: 0,
  defaultFixedCostPerBatchCents: 0,
  roundingStepCents: 10,
  roundingMode: "up",
  lastBackupAt: null,
};
