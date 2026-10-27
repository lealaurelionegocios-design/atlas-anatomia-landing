import { appDataSchema, BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, backupSchema, type BackupFile } from "../domain/schemas";
import type { AppData } from "../domain/types";

export function createBackup(data: AppData, now = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export const serializeBackup = (data: AppData, now = new Date()) => JSON.stringify(createBackup(data, now), null, 2);

export const backupFileName = (now = new Date()) => `sweetprofit-backup-${now.toISOString().slice(0, 10)}.json`;

export type RestoreError = "invalid_json" | "not_sweetprofit" | "newer_version" | "invalid_data";
export type RestoreResult = { ok: true; data: AppData; exportedAt: string } | { ok: false; error: RestoreError; detail?: string };

/** Legge e valida un file di backup. Non modifica nulla: la sostituzione avviene solo dopo conferma. */
export function parseBackup(text: string): RestoreResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (!raw || typeof raw !== "object" || (raw as { app?: unknown }).app !== BACKUP_APP_ID)
    return { ok: false, error: "not_sweetprofit" };
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === "number" && version > BACKUP_SCHEMA_VERSION) return { ok: false, error: "newer_version" };

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: "invalid_data", detail: issue ? `${issue.path.join(".")}: ${issue.message}` : undefined };
  }
  // Integrità referenziale: ogni riga di ricetta deve puntare a un ingrediente esistente.
  const ids = new Set(parsed.data.data.ingredients.map((i) => i.id));
  const broken = parsed.data.data.recipes.find((r) => r.items.some((it) => !ids.has(it.ingredientId)));
  if (broken) return { ok: false, error: "invalid_data", detail: `Ricetta "${broken.name}": ingrediente mancante` };
  return { ok: true, data: appDataSchema.parse(parsed.data.data) as AppData, exportedAt: parsed.data.exportedAt };
}
