import type { AppData, Ingredient, Recipe, Unit } from "./types";
import { DEFAULT_SETTINGS } from "./types";

/**
 * Dati di esempio (prezzi fittizi). Tutti i record hanno isDemo = true.
 * I totali sono verificati in tests/demo.test.ts.
 */
const D0 = "2026-01-15T09:00:00.000Z";
const D1 = "2026-04-10T09:00:00.000Z";
const D2 = "2026-09-01T09:00:00.000Z";

function ing(
  id: string, name: string, category: string, qty: number, unit: Unit, cents: number,
  extra: Partial<Ingredient> = {},
): Ingredient {
  return {
    id: `demo-ing-${id}`, name, category, purchaseQuantity: qty, purchaseUnit: unit, pricePaidCents: cents,
    supplier: "Fornitore di esempio", densityGPerMl: null, notes: "", isDemo: true,
    createdAt: D0, updatedAt: D2, priceHistory: [], ...extra,
  };
}

export const DEMO_INGREDIENTS: Ingredient[] = [
  ing("farina", "Farina 00", "Farine", 1, "kg", 180, {
    priceHistory: [{ date: D0, pricePaidCents: 165, purchaseQuantity: 1, purchaseUnit: "kg" }],
  }),
  ing("zucchero", "Zucchero semolato", "Zuccheri", 1, "kg", 150),
  ing("burro", "Burro", "Latticini", 250, "g", 250, {
    priceHistory: [
      { date: D0, pricePaidCents: 220, purchaseQuantity: 250, purchaseUnit: "g" },
      { date: D1, pricePaidCents: 235, purchaseQuantity: 250, purchaseUnit: "g" },
    ],
  }),
  ing("uova", "Uova fresche", "Uova", 6, "pz", 240),
  ing("latte", "Latte intero", "Latticini", 1, "l", 140, { densityGPerMl: 1.03 }),
  ing("fragole", "Fragole", "Frutta", 500, "g", 350, {
    priceHistory: [{ date: D1, pricePaidCents: 300, purchaseQuantity: 500, purchaseUnit: "g" }],
  }),
  ing("mascarpone", "Mascarpone", "Latticini", 500, "g", 450),
  ing("savoiardi", "Savoiardi", "Biscotti", 400, "g", 320),
  ing("caffe", "Caffè macinato", "Altro", 250, "g", 375),
  ing("cacao", "Cacao amaro in polvere", "Cioccolato", 250, "g", 300),
  ing("cioccolato", "Cioccolato fondente 70%", "Cioccolato", 200, "g", 280),
  ing("panna", "Panna fresca", "Latticini", 500, "ml", 250),
  ing("lievito", "Lievito per dolci", "Altro", 160, "g", 160),
  ing("zucchero-velo", "Zucchero a velo", "Zuccheri", 500, "g", 150),
  ing("pirottini", "Pirottini per cupcake", "Altro", 100, "pz", 300),
];

const it = (n: number, ingredient: string, quantity: number, unit: Unit) => ({
  id: `demo-item-${n}`, ingredientId: `demo-ing-${ingredient}`, quantity, unit,
});

export const DEMO_RECIPES: Recipe[] = [
  {
    id: "demo-rec-torta-fragole", name: "Torta alle Fragole", category: "Torte",
    yieldQuantity: 12, yieldUnit: "fette",
    items: [
      it(1, "farina", 200, "g"), it(2, "zucchero", 200, "g"), it(3, "uova", 4, "pz"), it(4, "burro", 100, "g"),
      it(5, "latte", 500, "ml"), it(6, "fragole", 500, "g"), it(7, "panna", 250, "ml"), it(8, "lievito", 16, "g"),
    ],
    laborMinutes: 90, laborHourlyRateCents: 1200,
    extraCosts: [
      { id: "demo-x-1", kind: "packaging", label: "Vassoio e scatola torta", amountCents: 200, basis: "batch" },
      { id: "demo-x-2", kind: "other", label: "Energia forno (stima)", amountCents: 80, basis: "batch" },
    ],
    wastePercent: 5, targetMarginPercent: 60, currentPriceCents: 450,
    notes: "Ricetta di esempio con prezzi fittizi.", isDemo: true, createdAt: D0, updatedAt: D2,
  },
  {
    id: "demo-rec-tiramisu", name: "Tiramisù", category: "Dolci al cucchiaio",
    yieldQuantity: 8, yieldUnit: "porzioni",
    items: [
      it(11, "mascarpone", 500, "g"), it(12, "uova", 4, "pz"), it(13, "zucchero", 100, "g"),
      it(14, "savoiardi", 300, "g"), it(15, "caffe", 30, "g"), it(16, "cacao", 10, "g"),
    ],
    laborMinutes: 40, laborHourlyRateCents: 1200,
    extraCosts: [
      { id: "demo-x-3", kind: "packaging", label: "Coppetta monoporzione con coperchio", amountCents: 35, basis: "unit" },
    ],
    wastePercent: 0, targetMarginPercent: 55, currentPriceCents: 500,
    notes: "Ricetta di esempio con prezzi fittizi.", isDemo: true, createdAt: D0, updatedAt: D2,
  },
  {
    id: "demo-rec-cupcake", name: "Cupcake al Cioccolato", category: "Monoporzioni",
    yieldQuantity: 12, yieldUnit: "pezzi",
    items: [
      it(21, "farina", 150, "g"), it(22, "zucchero", 150, "g"), it(23, "burro", 125, "g"), it(24, "uova", 2, "pz"),
      it(25, "cacao", 30, "g"), it(26, "cioccolato", 100, "g"), it(27, "latte", 120, "ml"), it(28, "lievito", 8, "g"),
      it(29, "panna", 200, "ml"), it(30, "zucchero-velo", 100, "g"), it(31, "pirottini", 12, "pz"),
    ],
    laborMinutes: 60, laborHourlyRateCents: 1200,
    extraCosts: [
      { id: "demo-x-4", kind: "packaging", label: "Scatolina singola", amountCents: 40, basis: "unit" },
    ],
    wastePercent: 3, targetMarginPercent: 50, currentPriceCents: 350,
    notes: "Ricetta di esempio con prezzi fittizi.", isDemo: true, createdAt: D0, updatedAt: D2,
  },
];

export const createDemoData = (): AppData => structuredClone({
  ingredients: DEMO_INGREDIENTS,
  recipes: DEMO_RECIPES,
  settings: { ...DEFAULT_SETTINGS },
});

export const hasDemoData = (data: AppData) =>
  data.ingredients.some((i) => i.isDemo) || data.recipes.some((r) => r.isDemo);

/**
 * Rimuove le ricette di esempio e gli ingredienti di esempio non usati
 * da ricette dell'utente (per non rompere le ricette dell'utente).
 */
export function removeDemoData(data: AppData): { data: AppData; keptIngredients: number } {
  const recipes = data.recipes.filter((r) => !r.isDemo);
  const used = new Set(recipes.flatMap((r) => r.items.map((i) => i.ingredientId)));
  const ingredients = data.ingredients.filter((i) => !i.isDemo || used.has(i.id));
  const keptIngredients = ingredients.filter((i) => i.isDemo).length;
  return { data: { ...data, recipes, ingredients }, keptIngredients };
}
