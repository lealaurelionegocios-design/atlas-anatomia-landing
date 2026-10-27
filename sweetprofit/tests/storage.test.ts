import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDemoData } from "@/lib/domain/demo";
import { createIndexedDbRepository } from "@/lib/storage/db";
import { backupFileName, parseBackup, serializeBackup } from "@/lib/storage/backup";

let n = 0;
const repo = () => createIndexedDbRepository(`test-db-${++n}`);

describe("persistenza IndexedDB", () => {
  it("database nuovo → null (primo avvio)", async () => {
    expect(await repo().load()).toBeNull();
  });

  it("salva e ricarica i dati identici", async () => {
    const r = repo();
    const data = createDemoData();
    await r.save(data);
    const loaded = await r.load();
    expect(loaded).not.toBeNull();
    const sortById = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
    expect(sortById(loaded!.ingredients)).toEqual(sortById(data.ingredients));
    expect(sortById(loaded!.recipes)).toEqual(sortById(data.recipes));
    expect(loaded!.settings).toEqual(data.settings);
  });

  it("i salvataggi successivi sostituiscono (anche le eliminazioni)", async () => {
    const r = repo();
    const data = createDemoData();
    await r.save(data);
    await r.save({ ...data, recipes: data.recipes.slice(1), settings: { ...data.settings, businessName: "Pasticceria Rosa" } });
    const loaded = (await r.load())!;
    expect(loaded.recipes).toHaveLength(2);
    expect(loaded.settings.businessName).toBe("Pasticceria Rosa");
  });

  it("dati vuoti restano un'app inizializzata (non ricarica gli esempi)", async () => {
    const r = repo();
    const data = createDemoData();
    await r.save({ ...data, ingredients: [], recipes: [] });
    const loaded = await r.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.recipes).toHaveLength(0);
  });

  it("clear cancella tutto", async () => {
    const r = repo();
    await r.save(createDemoData());
    await r.clear();
    expect(await r.load()).toBeNull();
  });
});

describe("backup e ripristino", () => {
  const now = new Date("2026-10-27T10:00:00Z");

  it("esporta e reimporta senza perdite", () => {
    const data = createDemoData();
    const text = serializeBackup(data, now);
    const r = parseBackup(text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual(data);
      expect(r.exportedAt).toBe(now.toISOString());
    }
    expect(backupFileName(now)).toBe("sweetprofit-backup-2026-10-27.json");
  });

  it("rifiuta file non JSON, di altre app o di versioni future", () => {
    expect(parseBackup("{non json")).toEqual({ ok: false, error: "invalid_json" });
    expect(parseBackup(JSON.stringify({ app: "altro" }))).toEqual({ ok: false, error: "not_sweetprofit" });
    const future = JSON.parse(serializeBackup(createDemoData(), now));
    future.schemaVersion = 99;
    expect(parseBackup(JSON.stringify(future))).toEqual({ ok: false, error: "newer_version" });
  });

  it("rifiuta dati incompleti o negativi", () => {
    const b = JSON.parse(serializeBackup(createDemoData(), now));
    b.data.ingredients[0].pricePaidCents = -10;
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_data");

    const c = JSON.parse(serializeBackup(createDemoData(), now));
    delete c.data.recipes[0].yieldQuantity;
    expect(parseBackup(JSON.stringify(c)).ok).toBe(false);

    const z = JSON.parse(serializeBackup(createDemoData(), now));
    z.data.recipes[0].yieldQuantity = 0;
    expect(parseBackup(JSON.stringify(z)).ok).toBe(false);
  });

  it("rifiuta ricette che puntano a ingredienti inesistenti", () => {
    const b = JSON.parse(serializeBackup(createDemoData(), now));
    b.data.ingredients = b.data.ingredients.filter((i: { id: string }) => i.id !== "demo-ing-farina");
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(false);
  });

  it("completa i campi opzionali mancanti con i valori predefiniti", () => {
    const b = JSON.parse(serializeBackup(createDemoData(), now));
    delete b.data.ingredients[0].supplier;
    delete b.data.settings.roundingMode;
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.ingredients[0].supplier).toBe("");
      expect(r.data.settings.roundingMode).toBe("up");
    }
  });

  it("backup → IndexedDB → ricarica", async () => {
    const r = repo();
    const parsed = parseBackup(serializeBackup(createDemoData(), now));
    if (!parsed.ok) throw new Error();
    await r.save(parsed.data);
    expect((await r.load())!.recipes).toHaveLength(3);
  });
});
