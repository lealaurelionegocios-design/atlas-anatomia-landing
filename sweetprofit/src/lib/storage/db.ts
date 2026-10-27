import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { appDataSchema } from "../domain/schemas";
import type { AppData, Ingredient, Recipe, Settings } from "../domain/types";

/**
 * Persistenza locale in IndexedDB.
 * I dati restano SOLO in questo browser: nessun server, nessuna sincronizzazione.
 * L'interfaccia `DataRepository` permette in futuro di aggiungere altri backend
 * (es. sincronizzazione su account) senza toccare la logica di calcolo.
 */

export const DB_NAME = "sweetprofit";
export const DB_VERSION = 1;

interface SweetProfitDB extends DBSchema {
  ingredients: { key: string; value: Ingredient };
  recipes: { key: string; value: Recipe };
  kv: { key: string; value: unknown };
}

export interface DataRepository {
  /** null se l'app non è mai stata inizializzata su questo browser. */
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export function createIndexedDbRepository(name = DB_NAME): DataRepository {
  let dbPromise: Promise<IDBPDatabase<SweetProfitDB>> | null = null;
  const getDb = () =>
    (dbPromise ??= openDB<SweetProfitDB>(name, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("ingredients", { keyPath: "id" });
        db.createObjectStore("recipes", { keyPath: "id" });
        db.createObjectStore("kv");
      },
    }));

  return {
    async load() {
      const db = await getDb();
      const initialized = await db.get("kv", "initialized");
      if (!initialized) return null;
      const [ingredients, recipes, settings] = await Promise.all([
        db.getAll("ingredients"),
        db.getAll("recipes"),
        db.get("kv", "settings") as Promise<Settings | undefined>,
      ]);
      // Validazione: protegge l'app da dati corrotti o di versioni diverse.
      const parsed = appDataSchema.safeParse({ ingredients, recipes, settings: settings ?? {} });
      if (!parsed.success) throw new Error("Dati locali non validi: " + parsed.error.issues[0]?.message);
      return parsed.data as AppData;
    },

    async save(data) {
      const db = await getDb();
      const tx = db.transaction(["ingredients", "recipes", "kv"], "readwrite");
      const ing = tx.objectStore("ingredients");
      const rec = tx.objectStore("recipes");
      const kv = tx.objectStore("kv");
      await Promise.all([ing.clear(), rec.clear()]);
      await Promise.all([
        ...data.ingredients.map((i) => ing.put(i)),
        ...data.recipes.map((r) => rec.put(r)),
        kv.put(data.settings, "settings"),
        kv.put(true, "initialized"),
      ]);
      await tx.done;
    },

    async clear() {
      const db = await getDb();
      const tx = db.transaction(["ingredients", "recipes", "kv"], "readwrite");
      await Promise.all([tx.objectStore("ingredients").clear(), tx.objectStore("recipes").clear(), tx.objectStore("kv").clear()]);
      await tx.done;
    },
  };
}
