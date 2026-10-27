"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createDemoData } from "../domain/demo";
import type { AppData } from "../domain/types";
import { createIndexedDbRepository, type DataRepository } from "../storage/db";
import { getMessages, type Messages } from "../i18n";

type Status = "loading" | "ready" | "error";
export type SaveState = "idle" | "saving" | "saved" | "error";

interface AppStore {
  status: Status;
  data: AppData;
  saveState: SaveState;
  m: Messages;
  /** Applica una modifica; il salvataggio locale è automatico. */
  update: (fn: (d: AppData) => AppData) => void;
  /** Sostituisce tutti i dati e salva subito (ripristino backup). */
  replaceAll: (d: AppData) => Promise<void>;
  /** Cancella tutto e riparte da un archivio vuoto. */
  wipe: () => Promise<void>;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children, repository }: { children: ReactNode; repository?: DataRepository }) {
  const repo = useMemo(() => repository ?? createIndexedDbRepository(), [repository]);
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AppData>(() => createDemoData());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  /** Copia sincrona dello stato: le modifiche consecutive si basano sempre sull'ultima versione. */
  const current = useRef<AppData>(data);
  const pending = useRef<AppData | null>(null);
  const saving = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let loaded = await repo.load();
        if (!loaded) {
          // Primo avvio: carica i dati di esempio (marcati come tali).
          loaded = createDemoData();
          await repo.save(loaded);
        }
        if (alive) {
          current.current = loaded;
          setData(loaded);
          setStatus("ready");
        }
      } catch (e) {
        console.error(e);
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [repo]);

  /**
   * Salvataggio immediato e accorpato: ogni modifica viene scritta subito;
   * se una scrittura è già in corso, alla fine si salva solo lo stato più recente.
   */
  const flush = useCallback((): Promise<void> => {
    if (saving.current) return saving.current;
    const run = (async () => {
      setSaveState("saving");
      try {
        while (pending.current) {
          const next = pending.current;
          pending.current = null;
          await repo.save(next);
        }
        setSaveState("saved");
      } catch (e) {
        console.error(e);
        setSaveState("error");
      } finally {
        saving.current = null;
      }
    })();
    saving.current = run;
    return run;
  }, [repo]);

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      const next = fn(current.current);
      current.current = next;
      pending.current = next;
      setData(next);
      void flush();
    },
    [flush],
  );

  const replaceAll = useCallback(
    async (d: AppData) => {
      current.current = d;
      pending.current = d;
      setData(d);
      setStatus("ready");
      await flush();
      if (pending.current) await flush();
    },
    [flush],
  );

  const wipe = useCallback(async () => {
    const empty: AppData = { ...createDemoData(), ingredients: [], recipes: [] };
    await replaceAll(empty);
  }, [replaceAll]);

  const value = useMemo<AppStore>(
    () => ({ status, data, saveState, m: getMessages(data.settings.locale), update, replaceAll, wipe }),
    [status, data, saveState, update, replaceAll, wipe],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): AppStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fuori da AppStoreProvider");
  return v;
}

export const useMessages = () => useStore().m;
