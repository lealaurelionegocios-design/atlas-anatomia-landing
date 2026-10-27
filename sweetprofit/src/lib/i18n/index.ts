import { it, type Messages } from "./messages/it";

export type Locale = "it";

/** Lingue disponibili. Per aggiungere "de" o "fr" basta registrarne i testi qui. */
export const LOCALES: Record<Locale, { label: string; intl: string; messages: Messages }> = {
  it: { label: "Italiano", intl: "it-IT", messages: it },
};

export const getMessages = (locale: Locale = "it"): Messages => LOCALES[locale].messages;
export type { Messages };
